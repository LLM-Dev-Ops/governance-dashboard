import type { ApiClient } from './client';
import type {
  Organization,
  OrganizationMember,
  Team,
  TeamMember,
  LLMProvider,
  LLMModel,
} from '@llm-dev-ops/types';

export class OrganizationsApi {
  constructor(private client: ApiClient) {}

  // Organizations
  async listOrganizations(): Promise<Organization[]> {
    const result = await this.client.get<{ data: Organization[] }>('/organizations');
    return result.data.data;
  }

  async getOrganization(id: string): Promise<Organization> {
    const result = await this.client.get<{ data: Organization }>(`/organizations/${id}`);
    return result.data.data;
  }

  async createOrganization(organization: Partial<Organization>): Promise<Organization> {
    const result = await this.client.post<{ data: Organization }>('/organizations', organization);
    return result.data.data;
  }

  async updateOrganization(id: string, organization: Partial<Organization>): Promise<Organization> {
    const result = await this.client.put<{ data: Organization }>(
      `/organizations/${id}`,
      organization
    );
    return result.data.data;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.client.delete(`/organizations/${id}`);
  }

  // Organization Members
  async listOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const result = await this.client.get<{ data: OrganizationMember[] }>(
      `/organizations/${organizationId}/members`
    );
    return result.data.data;
  }

  async addOrganizationMember(
    organizationId: string,
    userId: string,
    role: string
  ): Promise<OrganizationMember> {
    const result = await this.client.post<{ data: OrganizationMember }>(
      `/organizations/${organizationId}/members`,
      { user_id: userId, role }
    );
    return result.data.data;
  }

  async updateOrganizationMember(
    organizationId: string,
    memberId: string,
    role: string
  ): Promise<OrganizationMember> {
    const result = await this.client.put<{ data: OrganizationMember }>(
      `/organizations/${organizationId}/members/${memberId}`,
      { role }
    );
    return result.data.data;
  }

  async removeOrganizationMember(organizationId: string, memberId: string): Promise<void> {
    await this.client.delete(`/organizations/${organizationId}/members/${memberId}`);
  }

  // Teams
  async listTeams(organizationId: string): Promise<Team[]> {
    const result = await this.client.get<{ data: Team[] }>(
      `/organizations/${organizationId}/teams`
    );
    return result.data.data;
  }

  async getTeam(teamId: string): Promise<Team> {
    const result = await this.client.get<{ data: Team }>(`/teams/${teamId}`);
    return result.data.data;
  }

  async createTeam(organizationId: string, team: Partial<Team>): Promise<Team> {
    const result = await this.client.post<{ data: Team }>(
      `/organizations/${organizationId}/teams`,
      team
    );
    return result.data.data;
  }

  async updateTeam(teamId: string, team: Partial<Team>): Promise<Team> {
    const result = await this.client.put<{ data: Team }>(`/teams/${teamId}`, team);
    return result.data.data;
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.client.delete(`/teams/${teamId}`);
  }

  // Team Members
  async listTeamMembers(teamId: string): Promise<TeamMember[]> {
    const result = await this.client.get<{ data: TeamMember[] }>(`/teams/${teamId}/members`);
    return result.data.data;
  }

  async addTeamMember(teamId: string, userId: string, role?: string): Promise<TeamMember> {
    const result = await this.client.post<{ data: TeamMember }>(`/teams/${teamId}/members`, {
      user_id: userId,
      role: role || 'member',
    });
    return result.data.data;
  }

  async removeTeamMember(teamId: string, memberId: string): Promise<void> {
    await this.client.delete(`/teams/${teamId}/members/${memberId}`);
  }

  // LLM Providers
  async listProviders(organizationId: string): Promise<LLMProvider[]> {
    const result = await this.client.get<{ data: LLMProvider[] }>(
      `/organizations/${organizationId}/providers`
    );
    return result.data.data;
  }

  async getProvider(providerId: string): Promise<LLMProvider> {
    const result = await this.client.get<{ data: LLMProvider }>(`/providers/${providerId}`);
    return result.data.data;
  }

  async createProvider(
    organizationId: string,
    provider: Partial<LLMProvider>
  ): Promise<LLMProvider> {
    const result = await this.client.post<{ data: LLMProvider }>(
      `/organizations/${organizationId}/providers`,
      provider
    );
    return result.data.data;
  }

  async updateProvider(providerId: string, provider: Partial<LLMProvider>): Promise<LLMProvider> {
    const result = await this.client.put<{ data: LLMProvider }>(`/providers/${providerId}`, provider);
    return result.data.data;
  }

  async deleteProvider(providerId: string): Promise<void> {
    await this.client.delete(`/providers/${providerId}`);
  }

  // LLM Models
  async listModels(providerId: string): Promise<LLMModel[]> {
    const result = await this.client.get<{ data: LLMModel[] }>(`/providers/${providerId}/models`);
    return result.data.data;
  }

  async getModel(modelId: string): Promise<LLMModel> {
    const result = await this.client.get<{ data: LLMModel }>(`/models/${modelId}`);
    return result.data.data;
  }

  async createModel(providerId: string, model: Partial<LLMModel>): Promise<LLMModel> {
    const result = await this.client.post<{ data: LLMModel }>(
      `/providers/${providerId}/models`,
      model
    );
    return result.data.data;
  }

  async updateModel(modelId: string, model: Partial<LLMModel>): Promise<LLMModel> {
    const result = await this.client.put<{ data: LLMModel }>(`/models/${modelId}`, model);
    return result.data.data;
  }

  async deleteModel(modelId: string): Promise<void> {
    await this.client.delete(`/models/${modelId}`);
  }
}
