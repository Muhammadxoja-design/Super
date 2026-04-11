$ErrorActionPreference = "Stop"

$supabaseUrl = "https://foivrgfmesjydyjfcgbn.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvaXZyZ2ZtZXNqeWR5amZjZ2JuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTMzMDgsImV4cCI6MjA4ODE2OTMwOH0.wLjCuGuQqBSx_9813YP0Wj0r4mvn_cUzHtoy70AZAC0"

Write-Host "Reading Uz Locations..."
$jsonContent = Get-Content -Raw -Encoding UTF8 "client\src\lib\uz_locations.json"
$locations = $jsonContent | ConvertFrom-Json

$fargonaDistricts = $locations.'Farg''ona viloyati'.districts
$fargonaMahallas = $locations.'Farg''ona viloyati'.mahallas

$namesMale = @("Aziz", "Sardor", "Rustam", "Jasur", "Timur", "Alisher", "Bobur", "Shavkat", "Umid", "Farrux", "Davron", "Shohruh", "Ilhom", "Otabek", "Doston", "Sanjar", "Nodir", "Sherzod", "Akmal", "Javohir", "Murod", "Bekzod", "Shuxrat", "Zafar")
$namesFemale = @("Sevara", "Nargiza", "Dilnoza", "Zilola", "Malika", "Shohida", "Nilufar", "Gulnora", "Feruza", "Zamira", "Shahnoza", "Umida", "Dinora", "Nigora", "Salima", "Go'zal", "Madina", "Shirin", "Oydin", "Guli")
$lastNames = @("Abdullaev", "Karimov", "Rahimov", "Usmonov", "Ibragimov", "Yusupov", "Nazarov", "Xabibullaev", "Toshmatov", "Eshmatov", "Sodikov", "Jalilov", "Aliyev", "Valiyev", "Qodirov", "Nuriddinov", "Tursunov", "Olimov")
$prefixes = @("90", "91", "93", "94", "95", "97", "98", "99")
$directions = @("Bosh sardor", "Mutolaa", "Matbuot va media", "Iqtidor", "Qizlar akademiyasi", "Yashil makon", "Ustoz AI", "Ibrat farzandlari", "Jasorat")

$users = @()
$sqlLines = @()

Write-Host "Generating 1000 fake Farg'ona users..."
for ($i = 0; $i -lt 1000; $i++) {
    $isMale = (Get-Random -Minimum 0 -Maximum 2) -eq 1
    
    $firstName = ""
    $lastName = ""
    if ($isMale) {
        $firstName = $namesMale[(Get-Random -Minimum 0 -Maximum $namesMale.Length)]
        $lastName = $lastNames[(Get-Random -Minimum 0 -Maximum $lastNames.Length)]
    } else {
        $firstName = $namesFemale[(Get-Random -Minimum 0 -Maximum $namesFemale.Length)]
        $lastName = $lastNames[(Get-Random -Minimum 0 -Maximum $lastNames.Length)] + "a"
    }

    $tuman = $fargonaDistricts[(Get-Random -Minimum 0 -Maximum $fargonaDistricts.Length)]
    
    $mahallaList = @()
    if ($fargonaMahallas.$tuman -is [array]) {
        $mahallaList = $fargonaMahallas.$tuman
    } elseif ($fargonaMahallas.$tuman -ne $null) {
        foreach ($prop in $fargonaMahallas.$tuman.PSObject.Properties) {
            $mahallaList += $prop.Value
        }
    }
    
    $mahalla = "Markaz MFY"
    if ($mahallaList.Length -gt 0) {
        $mahalla = $mahallaList[(Get-Random -Minimum 0 -Maximum $mahallaList.Length)]
    }

    $phone = "+998" + $prefixes[(Get-Random -Minimum 0 -Maximum $prefixes.Length)] + (Get-Random -Minimum 1000000 -Maximum 9999999).ToString()
    
    $year = (Get-Random -Minimum 1985 -Maximum 2005)
    $month = (Get-Random -Minimum 1 -Maximum 13).ToString().PadLeft(2, "0")
    $day = (Get-Random -Minimum 1 -Maximum 29).ToString().PadLeft(2, "0")
    $birthDate = "$year-$month-$day"
    
    $direction = $directions[(Get-Random -Minimum 0 -Maximum $directions.Length)]
    $telegramId = "fake_" + (Get-Date).Ticks + "_" + (Get-Random -Minimum 10000 -Maximum 99999)
    $login = "fake_" + $firstName.ToLower() + "_" + (Get-Random -Minimum 1000 -Maximum 9999)
    $username = $firstName.ToLower() + "_" + (Get-Random -Minimum 100 -Maximum 999)
    
    $shahar = $null
    $hasShahar = $tuman -match "shahri"
    if ($hasShahar) { $shahar = $tuman }

    $userObj = @{
        telegram_id = $telegramId
        login = $login
        username = $username
        first_name = $firstName
        last_name = $lastName
        phone = $phone
        region = "Farg'ona viloyati"
        viloyat = "Farg'ona viloyati"
        district = $tuman
        tuman = $tuman
        shahar = $shahar
        mahalla = $mahalla
        birth_date = $birthDate
        direction = $direction
        status = "approved"
        role = "user"
        plan = "FREE"
        is_admin = $false
    }
    
    $users += $userObj
    
    $s_val = "NULL"
    if ($hasShahar) { $s_val = "'$shahar'" }
    $sqlData = "INSERT INTO users (telegram_id, login, username, first_name, last_name, phone, region, viloyat, tuman, district, shahar, mahalla, birth_date, direction, status, role, plan, is_admin) VALUES ('$telegramId', '$login', '$username', '$firstName', '$lastName', '$phone', 'Farg''ona viloyati', 'Farg''ona viloyati', '$tuman', '$tuman', $s_val, '$mahalla', '$birthDate', '$direction', 'approved', 'user', 'FREE', false);"
    $sqlLines += $sqlData
}

Write-Host "Saving to local fake-users.sql..."
$sqlLines | Out-File "fake-users.sql" -Encoding utf8

Write-Host "Sending to Supabase in chunks..."
$chunkSize = 100
for ($i = 0; $i -lt $users.Length; $i += $chunkSize) {
    if ($i + $chunkSize -gt $users.Length) {
        $chunk = $users[$i..($users.Length - 1)]
    } else {
        $chunk = $users[$i..($i + $chunkSize - 1)]
    }
    
    $jsonBody = $chunk | ConvertTo-Json -Depth 5 -Compress
    $headers = @{
        "apikey" = $supabaseKey
        "Authorization" = "Bearer $supabaseKey"
        "Content-Type" = "application/json"
        "Prefer" = "return=minimal"
    }
    
    try {
        Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody))
        Write-Host "Uploaded chunk $(($i/$chunkSize)+1)"
    } catch {
        Write-Host "Error uploading chunk:"
        Write-Host $_.Exception.Message
    }
}

Write-Host "Done!"
