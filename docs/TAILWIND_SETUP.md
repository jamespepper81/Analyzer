# Tailwind CSS 4 Language Server Setup

## Overview

BitSleuth uses Tailwind CSS 4 for styling, and the Tailwind CSS Language Server provides enhanced IDE features including:

- **IntelliSense**: Autocomplete for Tailwind CSS classes
- **Linting**: Warnings for unknown or deprecated classes
- **Hover Previews**: See the generated CSS on hover
- **Color Decorators**: Visual color indicators for color utilities
- **Class Sorting**: Automatic class ordering suggestions

## Installation

### Automatic Installation (Recommended)

The Tailwind CSS language server is included in the project's `devDependencies` and will be installed automatically when you run:

```bash
npm install
```

This ensures all developers use the same version (`^0.14.29`) and maintains consistency across the team.

### Global Installation (Optional)

If you prefer a global installation for use across multiple projects:

```bash
npm install -g @tailwindcss/language-server
```

Note: The VS Code extension will use the local version from `node_modules` if available, falling back to the global installation.

### VS Code Extension

For the best experience in VS Code, install the official Tailwind CSS IntelliSense extension:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Tailwind CSS IntelliSense"
4. Install the extension by Brad Lc

Alternatively, VS Code will prompt you to install recommended extensions when you open the repository.

## Configuration

### VS Code Settings

The repository includes VS Code settings (`.vscode/settings.json`) pre-configured for Tailwind CSS:

- **Class Regex**: Configured to recognize Tailwind classes in `cva()` and `cn()` utility functions
- **Include Languages**: TypeScript and TSX support enabled
- **Quick Suggestions**: Enabled for strings to get autocomplete in className attributes
- **Emmet Completions**: Enabled for faster class writing
- **CSS Validation**: Disabled to prevent conflicts with Tailwind's utility-first approach

### Tailwind Configuration

The project's Tailwind configuration is located at:
- `tailwind.config.ts` - Main Tailwind configuration file
- `postcss.config.mjs` - PostCSS configuration for Tailwind processing

**Note**: Tailwind CSS 4 uses a new PostCSS-based architecture. The project uses `@tailwindcss/postcss` (v4.1.18) instead of the traditional separate PostCSS plugins. This provides improved performance and better integration with Next.js.

## Features in BitSleuth

### Custom Class Patterns

The language server is configured to recognize Tailwind classes in:

1. **Standard className attributes**:
   ```tsx
   <div className="flex items-center justify-between">
   ```

2. **Class Variance Authority (CVA)**:
   ```tsx
   const buttonVariants = cva("rounded-md font-medium", {
     variants: {
       variant: {
         default: "bg-primary text-white",
       }
     }
   })
   ```

3. **CN utility function**:
   ```tsx
   <div className={cn("base-class", condition && "conditional-class")}>
   ```

## Troubleshooting

### IntelliSense Not Working

If autocomplete isn't showing:

1. **Verify extension is installed**: Check that "Tailwind CSS IntelliSense" is active in VS Code
2. **Restart VS Code**: Sometimes the language server needs a fresh start
3. **Check Tailwind config**: Ensure `tailwind.config.ts` is in the project root
4. **Verify file type**: Make sure you're editing a `.tsx`, `.ts`, `.jsx`, or `.js` file

### Classes Not Being Recognized

If specific classes aren't autocompleting:

1. **Check custom regex**: The VS Code settings include custom regex patterns for `cva()` and `cn()`
2. **Verify Tailwind version**: Ensure your Tailwind version matches the language server's expectations
3. **Clear cache**: Try deleting `.next` folder and rebuilding: `npm run dev:clean`

### Language Server Errors

If you see language server errors:

1. **Reinstall dependencies**: 
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check VS Code output**: View → Output → Select "Tailwind CSS Language Server" from dropdown

3. **Verify Node.js version**: Ensure you're using Node.js 20+

4. **Tailwind v4 compatibility**: The language server should automatically detect Tailwind CSS 4. If issues persist, ensure you have the latest version of the Tailwind CSS IntelliSense extension.

## Benefits for Development

### Faster Development
- Autocomplete reduces typos and speeds up class writing
- Hover previews eliminate the need to check documentation

### Better Code Quality
- Linting catches invalid or deprecated classes
- Class sorting keeps code consistent

### Enhanced Learning
- IntelliSense helps discover available utilities
- Hover previews teach the underlying CSS

## Additional Resources

- [Tailwind CSS IntelliSense Extension](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Tailwind CSS Language Server GitHub](https://github.com/tailwindlabs/tailwindcss-intellisense)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Built with ❤️ by BitSleuth**
