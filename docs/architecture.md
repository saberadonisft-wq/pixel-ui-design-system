# Architecture

The repository separates semantics from appearance:

1. `@pixel-ui/core` owns shared types, semantic tokens, grid/density scales, geometry utilities, foundation CSS, and primitive visual layers.
2. `@pixel-ui/themes` maps theme-specific values into the core semantic token contract.
3. `@pixel-ui/react` owns semantic React adapters and state/prop mapping. It does not own theme colors.
4. Examples own only product data, layout, and domain composition.

## Dependency direction

`examples → react → core` and `examples → themes`. Themes never import screen CSS. Core never imports a theme.

## CSS layering

Import in this order:

1. `@pixel-ui/core/styles.css`
2. `@pixel-ui/react/styles.css`
3. one or more `@pixel-ui/themes/*.css`
4. application layout CSS

Application CSS may use semantic tokens, but must not redraw a primitive that already exists.

## Publishing

Each package exposes ESM JavaScript/type declarations plus direct CSS exports. Workspace examples consume the same export surface intended for downstream projects.

