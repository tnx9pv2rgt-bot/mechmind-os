import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetRecoveryPhoneDto {
  @IsString({ message: 'Il numero di telefono deve essere una stringa' })
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Inserisci un numero di telefono valido in formato internazionale (+39...)',
  })
  @ApiProperty({
    description: 'Numero di telefono in formato E.164',
    example: '+393331234567',
  })
  phone: string;
}

export class VerifyPhoneDto {
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @IsString({ message: 'Il codice deve essere una stringa' })
  // eslint-disable-next-line sonarjs/no-duplicate-string
  @Length(6, 6, { message: 'Il codice deve essere di 6 cifre' })
  @ApiProperty({
    // eslint-disable-next-line sonarjs/no-duplicate-string
    description: 'Codice OTP di 6 cifre ricevuto via SMS',
    example: '123456',
  })
  code: string;
}

export class SendRecoveryOtpDto {
  @IsEmail({}, { message: "Inserisci un'email valida" })
  @ApiProperty({
    description: "Email dell'utente per il recupero account",
    example: 'utente@officina.it',
  })
  email: string;
}

export class VerifyRecoveryOtpDto {
  @IsEmail({}, { message: "Inserisci un'email valida" })
  @ApiProperty({
    description: "Email dell'utente",
    example: 'utente@officina.it',
  })
  email: string;

  @IsString({ message: 'Il codice deve essere una stringa' })
  @Length(6, 6, { message: 'Il codice deve essere di 6 cifre' })
  @ApiProperty({
    description: 'Codice OTP di 6 cifre ricevuto via SMS',
    example: '123456',
  })
  code: string;
}

export class VerifySmsOtpDto {
  @IsString({ message: 'Il token temporaneo è obbligatorio' })
  @ApiProperty({
    description: 'Token temporaneo ricevuto durante il login',
  })
  tempToken: string;

  @IsString({ message: 'Il codice deve essere una stringa' })
  @Length(6, 6, { message: 'Il codice deve essere di 6 cifre' })
  @ApiProperty({
    description: 'Codice OTP di 6 cifre ricevuto via SMS',
    example: '123456',
  })
  code: string;
}
