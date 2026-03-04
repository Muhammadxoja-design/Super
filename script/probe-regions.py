import socket
import logging

regions = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "af-south-1", "ap-east-1", "ap-south-1", "ap-northeast-3", "ap-northeast-2",
    "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ca-central-1",
    "eu-central-1", "eu-west-1", "eu-west-2", "eu-south-1", "eu-west-3", "eu-north-1",
    "me-south-1", "sa-east-1"
]

project_id = "foivrgfmesjydyjfcgbn"
port = 6543

def check_region(region):
    host = f"aws-0-{region}.pooler.supabase.com"
    try:
        addr = socket.gethostbyname(host)
        return addr
    except:
        return None

for r in regions:
    addr = check_region(r)
    if addr:
        print(f"Region {r} resolves to {addr}")
    else:
        # Some regions use a different format or are not aws-0
        pass

# Also try the new pooler format
host_new = f"{project_id}.pooler.supabase.com"
try:
    addr = socket.gethostbyname(host_new)
    print(f"Global pooler {host_new} resolves to {addr}")
except:
    pass
