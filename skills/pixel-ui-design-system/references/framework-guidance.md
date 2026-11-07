# Framework guidance

## Contents

1. Shared architecture
2. HTML and CSS
3. React
4. Vue
5. Svelte
6. Tailwind CSS
7. CSS Modules and styled-components
8. Vanilla TypeScript

## 1. Shared architecture

Keep core rules framework-independent:

```text
semantic tokens → geometry/utilities → visual primitives → framework adapters → product composition
```

Keep data, state, and copy outside visual primitives. Preserve the project's current framework and build system. Add no UI library for a component that can be composed locally from existing primitives.

## 2. HTML and CSS

Use semantic elements and `data-px-*` attributes for mode, theme, density, grid, tone, variant, size, and state. Put literal theme colors only in theme scopes. Use custom properties for all geometry and component aliases.

```html
<button class="px-control" data-px-tone="accent">
  <span class="px-control__marker" aria-hidden="true"></span>
  <span>Equip</span>
</button>
```

## 3. React

Forward refs and native element attributes. Prefer small adapters that map props to data attributes. Compose domain components from primitives instead of copying primitive CSS.

```tsx
function InventoryAction(props: ComponentProps<typeof PixelButton>) {
  return <PixelButton tone="accent" {...props} />;
}
```

Keep interaction behavior in hooks/components and appearance in shared CSS. Do not put theme hex values in inline style. Inline custom properties are acceptable for dynamic data such as progress value or declared sprite source size.

## 4. Vue

Expose native attributes with `$attrs`, emit semantic events, and bind data attributes:

```vue
<button class="px-control" :data-px-tone="tone" v-bind="$attrs">
  <slot />
</button>
```

Keep scoped styles limited to composition. Place reusable primitive styles and theme tokens in shared unscoped layers.

## 5. Svelte

Forward DOM events and attributes, and use component props only to select semantic state:

```svelte
<button class="px-control" data-px-tone={tone} {...rest}>
  <slot />
</button>
```

Do not duplicate theme selectors inside each component. Keep sprite metadata as data and render through a shared sprite primitive.

## 6. Tailwind CSS

Define tokens in CSS first. Expose semantic utilities or arbitrary properties that reference variables; do not encode one-off pixel literals throughout markup.

Prefer:

```html
<button class="min-h-[var(--px-control-md)] px-[var(--px-space-3)] bg-[var(--px-accent)]">
```

Avoid long class strings that independently rebuild frame layers on every component. Extract shared components or component classes with `@layer components`. Do not introduce Tailwind into a project that does not use it.

## 7. CSS Modules and styled-components

CSS Modules may own product layout and composition; shared primitive modules own geometry. Theme values remain global custom properties. With styled-components, interpolate semantic props into `data-*` attributes or component aliases—not raw theme colors and magic numbers.

Avoid runtime-generated fractional values. Dynamic layout values must resolve to integer CSS pixels when they affect pixel geometry.

## 8. Vanilla TypeScript

Create small DOM factories for repeated primitives, preserve native semantics, and attach behavior separately:

```ts
export function pixelButton(label: string) {
  const button = document.createElement("button");
  button.className = "px-control";
  button.textContent = label;
  return button;
}
```

Do not build giant HTML strings with duplicated visual markup. Keep sprite definitions and product data in structured objects.
