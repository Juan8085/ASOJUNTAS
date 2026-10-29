import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { JacsModule } from "./modules/jacs/jacs.module";
import { AffiliatesModule } from "./modules/affiliates/affiliates.module";
import { CertificatesModule } from "./modules/certificates/certificates.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { TreasuryModule } from "./modules/treasury/treasury.module";
import { JwtAuthGuard } from "./core/guards/jwt-auth.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    JacsModule,
    AffiliatesModule,
    CertificatesModule,
    PaymentsModule,
    TreasuryModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
