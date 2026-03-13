import { useUser } from "./use-auth";

/**
 * Returns whether the current user's profile is complete.
 * A profile is complete if firstName, phone, region, district, and direction are set.
 *
 * This centralizes the check that was duplicated across App.tsx, Dashboard.tsx, and BottomNav.tsx.
 */
export function useProfileComplete(): {
  profileComplete: boolean;
  isLoading: boolean;
} {
  const { data: user, isLoading } = useUser();

  if (isLoading || !user) {
    return { profileComplete: false, isLoading };
  }

  const profileComplete = Boolean(
    user.firstName &&
    user.phone &&
    (user.viloyat || user.region) &&
    (user.tuman || user.district || user.shahar) &&
    user.mahalla &&
    user.direction &&
    user.birthDate,
  );

  return { profileComplete, isLoading };
}
