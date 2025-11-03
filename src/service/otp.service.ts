import prisma from '../client';
import { EmailService } from './email.service';

// Use string union type instead of enum to match Prisma
export type OtpType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export const OTP_TYPES = {
    EMAIL_VERIFICATION: 'EMAIL_VERIFICATION' as const,
    PASSWORD_RESET: 'PASSWORD_RESET' as const,
};

export class OtpService {
    private emailService: EmailService;

    constructor() {
        this.emailService = new EmailService();
    }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async generateAndSendOtp(email: string, type: OtpType, userName: string) {
        const otp = this.generateOtp();
        const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_IN || '300000')); // 5 minutes

        // Delete any existing OTPs for this email and type
        await prisma.otpCode.deleteMany({
            where: {
                email,
                type,
                isUsed: false
            }
        });

        // Create new OTP
        await prisma.otpCode.create({
            data: {
                code: otp,
                email,
                type,
                expiresAt,
            }
        });

        // Send email based on type
        try {
            if (type === OTP_TYPES.EMAIL_VERIFICATION) {
                await this.emailService.sendVerificationEmail(email, otp, userName);
            } else if (type === OTP_TYPES.PASSWORD_RESET) {
                await this.emailService.sendPasswordResetEmail(email, otp, userName);
            }
        } catch (error) {
            // If email sending fails, delete the created OTP
            await prisma.otpCode.deleteMany({
                where: {
                    email,
                    type,
                    code: otp
                }
            });
            throw error;
        }

        return { message: 'OTP sent successfully' };
    }

    async verifyOtp(email: string, code: string, type: OtpType): Promise<boolean> {
        const otpRecord = await prisma.otpCode.findFirst({
            where: {
                email,
                code,
                type,
                isUsed: false,
                expiresAt: {
                    gte: new Date()
                }
            }
        });

        if (!otpRecord) {
            return false;
        }

        // Mark OTP as used
        await prisma.otpCode.update({
            where: {
                id: otpRecord.id
            },
            data: {
                isUsed: true
            }
        });

        return true;
    }

    async resendOtp(email: string, type: OtpType, userName: string) {
        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new Error('User not found');
        }

        // Check if there's a recent OTP (to prevent spam)
        const recentOtp = await prisma.otpCode.findFirst({
            where: {
                email,
                type,
                createdAt: {
                    gte: new Date(Date.now() - 60000) // 1 minute ago
                }
            }
        });

        if (recentOtp) {
            throw new Error('Please wait before requesting a new OTP');
        }

        return this.generateAndSendOtp(email, type, userName);
    }

    async cleanupExpiredOtps() {
        await prisma.otpCode.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date()
                }
            }
        });
    }
}