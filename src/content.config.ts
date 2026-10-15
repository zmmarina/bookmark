import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: () =>
		z.object({
			title: z.string(),
			author: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			tags: z.array(z.string()),
			// Escala de 1 (nada picante) a 5 (muito picante)
			hot: z.number().min(0).max(5),
			// Sua nota geral pro livro, de 1 a 10
			nota: z.number().min(1).max(10),
			couple: z.array(z.string()),
			amazonLink: z.string().url(),
		}),
});

export const collections = { blog };