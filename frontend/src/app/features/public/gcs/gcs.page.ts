import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideQrCode, LucideUsersRound } from '@lucide/angular';

import { BottomNavComponent } from '../../../shared/bottom-nav/bottom-nav.component';

@Component({
  selector: 'dnms-gcs-page',
  imports: [BottomNavComponent, LucideUsersRound, LucideQrCode],
  templateUrl: './gcs.page.html',
  styleUrl: './gcs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GcsPage {
  readonly whatsappUrl = 'https://wa.me/5581999499159';
}
