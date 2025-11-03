export interface VerifyOtpDto {
    email: string;
    otp: string;
}

export interface ResendOtpDto {
    email: string;
}