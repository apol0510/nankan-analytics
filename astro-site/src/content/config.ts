import { defineCollection, z } from 'astro:content';

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    tags: z.array(z.string()).optional(),
    category: z.string(),
    author: z.string().default('NANKANアナリティクス'),
    heroImage: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = {
  blog: blogCollection,
};