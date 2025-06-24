import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SupabaseService } from '../core/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      const { data: { session } } = await this.supabaseService.client.auth.getSession();
      
      if (session) {
        return true;
      } else {
        this.router.navigate(['/login']);
        return false;
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      this.router.navigate(['/login']);
      return false;
    }
  }
} 