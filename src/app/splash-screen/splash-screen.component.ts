import { Component, OnInit } from '@angular/core';
import { AnimationItem } from 'lottie-web';
import { AnimationOptions } from 'ngx-lottie';
import { CommonModule } from '@angular/common';
import { LottieComponent } from 'ngx-lottie';

@Component({
  selector: 'app-splash-screen',
  templateUrl: './splash-screen.component.html',
  styleUrls: ['./splash-screen.component.scss'],
  standalone: true,
  imports: [CommonModule, LottieComponent]
})
export class SplashScreenComponent implements OnInit {
  show = true;
  
  animationCreated(animationItem: AnimationItem): void {
    console.log('Animación Lottie creada:', animationItem);
  }

  options: AnimationOptions = {
    path: 'assets/Animation - 1751927760596.json', // Ruta relativa sin slash inicial
    loop: true,
    autoplay: true,
  };

  constructor() { 
    console.log('SplashScreenComponent constructor ejecutado');
  }

  ngOnInit() {
    console.log('SplashScreenComponent ngOnInit ejecutado, show =', this.show);
    setTimeout(() => {
      console.log('Ocultando splash después de 1 segundo (forzado)');
      this.show = false;
    }, 1000); // 1 segundo
  }
}
