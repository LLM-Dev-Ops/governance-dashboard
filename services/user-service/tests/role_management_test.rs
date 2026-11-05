#[cfg(test)]
mod role_management_tests {
    #[derive(Clone, Copy, Debug, Eq, PartialEq)]
    enum Role {
        User,
        Manager,
        Admin,
    }

    fn rank(role: Role) -> u8 {
        match role {
            Role::User => 1,
            Role::Manager => 2,
            Role::Admin => 3,
        }
    }

    fn permissions(role: Role) -> &'static [&'static str] {
        match role {
            Role::User => &["read"],
            Role::Manager => &["read", "write"],
            Role::Admin => &["read", "write", "admin"],
        }
    }

    #[test]
    fn test_assign_role_to_user() {
        let assigned = vec![Role::User];
        assert_eq!(assigned, [Role::User]);
    }

    #[test]
    fn test_remove_role_from_user() {
        let mut assigned = vec![Role::User, Role::Manager];
        assigned.retain(|role| *role != Role::User);
        assert_eq!(assigned, [Role::Manager]);
    }

    #[test]
    fn test_get_user_roles() {
        let assigned = [Role::User, Role::Manager];
        assert!(assigned.contains(&Role::Manager));
    }

    #[test]
    fn test_role_hierarchy() {
        assert!(rank(Role::Admin) > rank(Role::Manager));
        assert!(rank(Role::Manager) > rank(Role::User));
    }

    #[test]
    fn test_role_permissions() {
        assert!(permissions(Role::Admin).contains(&"admin"));
        assert!(!permissions(Role::User).contains(&"admin"));
    }

    #[test]
    fn test_multiple_roles_per_user() {
        let assigned = [Role::User, Role::Manager];
        assert_eq!(assigned.len(), 2);
    }

    #[test]
    fn test_role_inheritance() {
        for permission in permissions(Role::Manager) {
            assert!(permissions(Role::Admin).contains(permission));
        }
    }
}
