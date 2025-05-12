import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from 'src/app/core/supabase.service';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonButton
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
export class RegisterPage {

  nombre = '';
  email = '';
  password = '';
  error: string | null = null;

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async registrarse() {
    try {
      await this.supabaseService.signUp(this.email, this.password, this.nombre);
      this.router.navigate(['/home']);
    } catch (err: any) {
      this.error = err.message;
    }
  }
}
