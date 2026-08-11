export interface Client {
    id: number;
    nui: string;
    firstName: string;
    lastName: string;
    email?: string;
    mobile?: string;
    address?: string;
    city?: string;
    notes?: string;
    createdAt?: string;
}

export interface CreateClientDto {
    nui: string;
    firstName: string;
    lastName: string;
    email?: string;
    mobile?: string;
    address?: string;
    city?: string;
    notes?: string;
}

export type UpdateClientDto = Partial<Omit<CreateClientDto, 'nui'>>;