// Role-based home page routing — determines where each role lands after login.
export function getRoleHome(role) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "APPROVER":
      return "/approvals";
    case "BOOKER":
    default:
      return "/dashboard";
  }
}
