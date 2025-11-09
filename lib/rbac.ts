import { prisma } from '@/lib/prisma';
import { AuthorizationError } from '@/lib/errors';
import { TeamRole } from '@prisma/client';

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<TeamRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  EDITOR: 2,
  VIEWER: 1,
};

// Maximum role that can be assigned by each role
const MAX_ASSIGNABLE_ROLE: Record<TeamRole, TeamRole> = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
};

/**
 * Check if a user has a specific role or higher in a team
 */
export async function getUserTeamRole(userId: string, teamId: string): Promise<TeamRole | null> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
    select: { role: true },
  });

  return membership?.role || null;
}

/**
 * Check if user's role meets or exceeds the required role level
 */
export function hasMinimumRole(userRole: TeamRole, requiredRole: TeamRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if a user can assign a specific role to another user
 */
export function canAssignRole(assignerRole: TeamRole, targetRole: TeamRole): boolean {
  const maxAssignable = MAX_ASSIGNABLE_ROLE[assignerRole];
  return ROLE_HIERARCHY[targetRole] <= ROLE_HIERARCHY[maxAssignable];
}

/**
 * Check if user can view a project
 */
export async function canViewProject(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      teamId: true,
    },
  });

  if (!project) {
    return false;
  }

  // Owner can always view
  if (project.userId === userId) {
    return true;
  }

  // If project is not associated with a team, only owner can view
  if (!project.teamId) {
    return false;
  }

  // Check team membership
  const userRole = await getUserTeamRole(userId, project.teamId);
  return userRole !== null;
}

/**
 * Check if user can edit a project
 */
export async function canEditProject(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      teamId: true,
    },
  });

  if (!project) {
    return false;
  }

  // Owner can always edit
  if (project.userId === userId) {
    return true;
  }

  // If project is not associated with a team, only owner can edit
  if (!project.teamId) {
    return false;
  }

  // Check team membership and role
  const userRole = await getUserTeamRole(userId, project.teamId);
  if (!userRole) {
    return false;
  }

  // Editors, Admins, and Owners can edit
  return hasMinimumRole(userRole, 'EDITOR');
}

/**
 * Check if user can delete a project
 */
export async function canDeleteProject(userId: string, projectId: string): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      userId: true,
      teamId: true,
    },
  });

  if (!project) {
    return false;
  }

  // Owner can always delete
  if (project.userId === userId) {
    return true;
  }

  // If project is not associated with a team, only owner can delete
  if (!project.teamId) {
    return false;
  }

  // Check team membership and role
  const userRole = await getUserTeamRole(userId, project.teamId);
  if (!userRole) {
    return false;
  }

  // Only Admins and Owners can delete
  return hasMinimumRole(userRole, 'ADMIN');
}

/**
 * Check if user can manage a team (invite/remove members, change roles)
 */
export async function canManageTeam(userId: string, teamId: string): Promise<boolean> {
  const userRole = await getUserTeamRole(userId, teamId);
  if (!userRole) {
    return false;
  }

  // Only Admins and Owners can manage team
  return hasMinimumRole(userRole, 'ADMIN');
}

/**
 * Check if user can invite members to a team
 */
export async function canInviteMembers(userId: string, teamId: string): Promise<boolean> {
  const userRole = await getUserTeamRole(userId, teamId);
  if (!userRole) {
    return false;
  }

  // Only Admins and Owners can invite members
  return hasMinimumRole(userRole, 'ADMIN');
}

/**
 * Check if user can remove a specific member from a team
 */
export async function canRemoveMember(userId: string, teamId: string, targetUserId: string): Promise<boolean> {
  const userRole = await getUserTeamRole(userId, teamId);
  const targetRole = await getUserTeamRole(targetUserId, teamId);

  if (!userRole || !targetRole) {
    return false;
  }

  // Users cannot remove themselves
  if (userId === targetUserId) {
    return false;
  }

  // Only Admins and Owners can remove members
  if (!hasMinimumRole(userRole, 'ADMIN')) {
    return false;
  }

  // Admins cannot remove Owners
  if (userRole === 'ADMIN' && targetRole === 'OWNER') {
    return false;
  }

  // Users can only remove members with lower or equal role (except Owner can remove anyone)
  if (userRole !== 'OWNER' && ROLE_HIERARCHY[targetRole] > ROLE_HIERARCHY[userRole]) {
    return false;
  }

  return true;
}

/**
 * Check if user can change a member's role
 */
export async function canChangeMemberRole(
  userId: string,
  teamId: string,
  targetUserId: string,
  newRole: TeamRole
): Promise<boolean> {
  const userRole = await getUserTeamRole(userId, teamId);
  const targetRole = await getUserTeamRole(targetUserId, teamId);

  if (!userRole || !targetRole) {
    return false;
  }

  // Users cannot change their own role
  if (userId === targetUserId) {
    return false;
  }

  // Check if user can assign the target role
  if (!canAssignRole(userRole, newRole)) {
    return false;
  }

  // Only Admins and Owners can change roles
  if (!hasMinimumRole(userRole, 'ADMIN')) {
    return false;
  }

  // Admins cannot change Owner roles
  if (userRole === 'ADMIN' && targetRole === 'OWNER') {
    return false;
  }

  // Users can only change roles of members with lower role (except Owner can change anyone)
  if (userRole !== 'OWNER' && ROLE_HIERARCHY[targetRole] >= ROLE_HIERARCHY[userRole]) {
    return false;
  }

  return true;
}

/**
 * Middleware function to require project view permission
 */
export async function requireCanViewProject(userId: string, projectId: string) {
  const canView = await canViewProject(userId, projectId);
  if (!canView) {
    throw new AuthorizationError('You do not have permission to view this project');
  }
}

/**
 * Middleware function to require project edit permission
 */
export async function requireCanEditProject(userId: string, projectId: string) {
  const canEdit = await canEditProject(userId, projectId);
  if (!canEdit) {
    throw new AuthorizationError('You do not have permission to edit this project');
  }
}

/**
 * Middleware function to require project delete permission
 */
export async function requireCanDeleteProject(userId: string, projectId: string) {
  const canDelete = await canDeleteProject(userId, projectId);
  if (!canDelete) {
    throw new AuthorizationError('You do not have permission to delete this project');
  }
}

/**
 * Middleware function to require team management permission
 */
export async function requireCanManageTeam(userId: string, teamId: string) {
  const canManage = await canManageTeam(userId, teamId);
  if (!canManage) {
    throw new AuthorizationError('You do not have permission to manage this team');
  }
}

/**
 * Middleware function to require member invitation permission
 */
export async function requireCanInviteMembers(userId: string, teamId: string) {
  const canInvite = await canInviteMembers(userId, teamId);
  if (!canInvite) {
    throw new AuthorizationError('You do not have permission to invite members to this team');
  }
}

/**
 * Get all projects a user can access (own or team projects)
 */
export async function getUserAccessibleProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { userId }, // User's own projects
        {
          team: {
            members: {
              some: {
                userId,
              },
            },
          },
        }, // Team projects
      ],
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      userId: true,
      teamId: true,
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Add role information for team projects
  const projectsWithRoles = await Promise.all(
    projects.map(async (project) => {
      let userRole: TeamRole | null = null;

      if (project.teamId && project.userId !== userId) {
        userRole = await getUserTeamRole(userId, project.teamId);
      } else if (project.userId === userId) {
        userRole = 'OWNER'; // Project owners have full access
      }

      return {
        ...project,
        userRole,
        canEdit: userRole ? hasMinimumRole(userRole, 'EDITOR') : false,
        canDelete: userRole ? hasMinimumRole(userRole, 'ADMIN') : false,
      };
    })
  );

  return projectsWithRoles;
}