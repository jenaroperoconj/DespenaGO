import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton 
} from '@ionic/angular/standalone';
import { SupabaseService } from 'src/app/core/supabase.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonItem,
    IonLabel,
    IonInput,
    IonButton
  ]
})
export class LoginPage implements OnInit {
  email: string = '';
  password: string = '';
  error: string | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  ngOnInit() {
  }

  async login() {
    const { data, error } = await this.supabaseService.login(this.email, this.password);
    if (error) {
      this.error = error.message;
    } else {
      this.router.navigate(['/home']); // redirige al home
    }
  }
  goToRegister() {
    this.router.navigate(['/register']);
  }
}
