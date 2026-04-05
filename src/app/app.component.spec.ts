import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { AuthService } from './services/auth.service';
import { AdminNotificationService } from './services/admin-notification.service';
import { PushNotificationService } from './services/push-notification.service';

describe('AppComponent', () => {
  const authServiceMock = {
    user$: () => null
  };

  const adminNotificationServiceMock = {
    startListening: jasmine.createSpy('startListening'),
    stopListening: jasmine.createSpy('stopListening')
  };

  const pushNotificationServiceMock = {
    syncForUser: jasmine.createSpy('syncForUser')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: AdminNotificationService, useValue: adminNotificationServiceMock },
        { provide: PushNotificationService, useValue: pushNotificationServiceMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the 'DelLauti' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('DelLauti');
  });
});
