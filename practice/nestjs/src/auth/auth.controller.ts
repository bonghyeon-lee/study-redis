import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('otp/send')
  async sendOtp(@Body('email') email: string) {
    if (!email) throw new BadRequestException('Email is required');
    const otp = await this.authService.sendOtp(email);
    return { message: 'OTP sent successfully', otp }; // Returning OTP for practice/testing
  }

  @Post('otp/verify')
  async verifyOtp(@Body('email') email: string, @Body('code') code: string) {
    if (!email || !code)
      throw new BadRequestException('Email and code are required');
    const isValid = await this.authService.verifyOtp(email, code);
    if (!isValid) {
      return { success: false, message: 'Invalid or expired OTP' };
    }
    return { success: true, message: 'OTP verified successfully' };
  }

  @Post('otp/send-uncached')
  async sendOtpUncached(@Body('email') email: string) {
    if (!email) throw new BadRequestException('Email is required');
    const otp = await this.authService.sendOtpUncached(email);
    return { message: 'OTP sent successfully (Uncached)', otp };
  }

  @Post('otp/verify-uncached')
  async verifyOtpUncached(
    @Body('email') email: string,
    @Body('code') code: string,
  ) {
    if (!email || !code)
      throw new BadRequestException('Email and code are required');
    const isValid = await this.authService.verifyOtpUncached(email, code);
    if (!isValid) {
      return { success: false, message: 'Invalid or expired OTP (Uncached)' };
    }
    return { success: true, message: 'OTP verified successfully (Uncached)' };
  }
}
