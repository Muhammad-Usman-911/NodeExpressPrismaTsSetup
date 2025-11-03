import { Role } from '../../constants/role';

export interface RegisterDto {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: Role;
}