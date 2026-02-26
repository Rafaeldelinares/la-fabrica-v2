# ProjectCard Component

## Descripción
Componente React para visualizar tarjetas de proyecto con estado. Implementa Navy Industrial y Skeleton Screen.

## Props
- `title` (string): Nombre del proyecto
- `description` (string): Descripción breve
- `status` (enum): 'active' | 'pending' | 'error'
- `loading` (boolean): Mostrar Skeleton Screen

## Estándares Aplicados
- ✅ Navy Industrial (bg-slate-900/90, border-slate-800)
- ✅ Skeleton Screen (sin spinners)
- ✅ Líneas: 34/100
- ✅ Tipografía: Inter + Mono

## Ejemplo de Uso
```jsx
<ProjectCard 
  title="CRM ByBusiness"
  description="Sistema de gestión de clientes"
  status="active"
  loading={false}
/>
```

## Validación
Validado por Antrigravity - DÍA 5 ✅
