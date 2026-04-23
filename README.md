# Lexora ⚖️

Sistema de gestión jurídica orientado a estudios pequeños y medianos.

## 🚀 Descripción

Lexora es una aplicación web diseñada para gestionar expedientes judiciales, clientes, tareas y documentación de forma centralizada, permitiendo mejorar la organización y seguimiento de casos.

Este proyecto forma parte del trabajo integrador de la carrera y se desarrollará como un MVP escalable.

---

## 🧩 Funcionalidades principales (MVP)

- Gestión de expedientes
- Gestión de clientes
- Novedades y documentos asociados
- Agenda de tareas y plazos
- Sistema de autenticación (roles: Admin / Abogado)
- Exportación de reportes

---

## 🏗️ Arquitectura

El proyecto está organizado siguiendo una arquitectura basada en features:

src/
├── app/
    ├── core/           # servicios globales (auth, api, etc)
    ├── shared/         # componentes reutilizables
    ├── layout/         # sidebar, topbar
    ├── features/       # módulos funcionales
    ├── expedientes/
    ├── clientes/
    ├── agenda/
    ├── log/
    ├── configuracion/
    └── auth/

---

## 🛠️ Stack tecnológico

- Angular (Standalone Components)
- TypeScript
- Tailwind CSS
- RxJS / Signals

---

## ▶️ Instalación

```bash
git clone https://github.com/naiaraf-dev/lexora-app.git
cd lexora-app
npm install
ng serve
Abrir en navegador: http://localhost:4200
