import bcrypt from 'bcrypt';
import prisma from '../client';
import { RegisterDto } from '../types/auth/register';
import { LoginDto } from '../types/auth/login';
import { VerifyOtpDto } from '../types/auth/verifyOtp';
import { signToken, signRefreshToken } from '../utils/jwt.utils';
import { ROLES, Role } from '../constants/role';
import { OtpService, OtpType, OTP_TYPES } from './otp.service';

export class AuthService {
    private otpService: OtpService;

    constructor() {
        this.otpService = new OtpService();
    }

    async register(data: RegisterDto) {
        const { email, password, name, phone } = data;
        const role = data.role ?? ROLES.USER;
        
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user but not verified
        const user = await prisma.user.create({
            data: { 
                email, 
                password: hashedPassword, 
                name,
                phone: phone || null,
                role,
                isVerified: false 
            },
        });
        
        // Generate and send OTP
        await this.otpService.generateAndSendOtp(email, OTP_TYPES.EMAIL_VERIFICATION, name);
        
        return { 
            message: 'Registration successful. Please check your email for verification code.',
            user: {
                id: user.id, 
                email: user.email, 
                name: user.name,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified
            }
        };
    }

    async verifyEmail(data: VerifyOtpDto) {
        const { email, otp } = data;
        
        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('User not found');
        }

        if (user.isVerified) {
            throw new Error('Email is already verified');
        }

        // Verify OTP
        const isValidOtp = await this.otpService.verifyOtp(email, otp, OTP_TYPES.EMAIL_VERIFICATION);
        if (!isValidOtp) {
            throw new Error('Invalid or expired OTP');
        }

        // Update user as verified
        const updatedUser = await prisma.user.update({
            where: { email },
            data: { isVerified: true }
        });

        // Generate tokens
        const token = signToken({ id: updatedUser.id, role: updatedUser.role as Role });
        const refreshToken = signRefreshToken({ id: updatedUser.id, role: updatedUser.role as Role });
        
        return { 
            message: 'Email verified successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                role: updatedUser.role,
                isVerified: updatedUser.isVerified
            },
            token,
            refreshToken
        };
    }

    async resendVerificationOtp(email: string) {
        // Check if user exists
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('User not found');
        }

        if (user.isVerified) {
            throw new Error('Email is already verified');
        }

        return this.otpService.resendOtp(email, OTP_TYPES.EMAIL_VERIFICATION, user.name);
    }

    async login(data: LoginDto) {
        const { email, password } = data;
        
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        if (!user.isVerified) {
            throw new Error('Please verify your email before logging in');
        }
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            throw new Error('Invalid credentials');
        }
        
        const token = signToken({ id: user.id, role: user.role as Role });
        const refreshToken = signRefreshToken({ id: user.id, role: user.role as Role });
        
        return { 
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified
            },
            token,
            refreshToken
        };
    }

    async refreshToken(refreshToken: string) {
        try {
            const { verifyRefreshToken, signToken } = await import('../utils/jwt.utils');
            const decoded = verifyRefreshToken(refreshToken);
            
            // Verify user still exists and is verified
            const user = await prisma.user.findUnique({ where: { id: decoded.id } });
            if (!user) {
                throw new Error('User not found');
            }

            if (!user.isVerified) {
                throw new Error('User email not verified');
            }
            
            const newToken = signToken({ id: user.id, role: user.role as Role });
            return { token: newToken };
        } catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
}