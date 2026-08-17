import { z } from "zod";

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Mínimo de 3 caracteres")
      .max(24, "Máximo de 24 caracteres")
      .regex(/^[a-z0-9_]+$/i, "Use apenas letras, números e _"),
    displayName: z.string().trim().min(1, "Obrigatório").max(60),
    password: z.string().min(6, "Mínimo de 6 caracteres").max(72),
    email: z
      .string()
      .trim()
      .email("E-mail inválido")
      .optional()
      .or(z.literal("")),
  })
  .transform((data) => ({
    ...data,
    email: data.email === "" ? undefined : data.email,
  }));

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const availabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startMin: z.number().int().min(0).max(24 * 60),
  endMin: z.number().int().min(0).max(24 * 60),
}).refine((data) => data.endMin > data.startMin, {
  message: "Horário final precisa ser depois do inicial",
  path: ["endMin"],
});

export const userGameFlagsSchema = z
  .object({
    tgdbId: z.number().int().positive().optional(),
    steamAppId: z.number().int().positive().optional(),
    gameId: z.string().min(1).optional(),
    interested: z.boolean().optional(),
    favorite: z.boolean().optional(),
    owned: z.boolean().optional(),
    blacklisted: z.boolean().optional(),
  })
  .refine(
    (data) => data.tgdbId !== undefined || data.steamAppId !== undefined || data.gameId !== undefined,
    { message: "Informe tgdbId, steamAppId ou gameId" },
  );

export const userIdsSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1),
});

export const drawSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1),
  requireOwned: z.boolean().optional(),
});

export const createRecruitmentSchema = z.object({
  gameId: z.string().min(1),
  scheduledAt: z.string().datetime().or(z.string().min(1)),
  hasTime: z.boolean().optional(),
});

export const inviteSchema = z.object({
  userIds: z.array(z.string().min(1)).min(1),
});

export const respondInviteSchema = z.object({
  accept: z.boolean(),
});

export const swipeVoteSchema = z.object({
  candidateId: z.string().min(1),
  liked: z.boolean(),
});

export const swipeConfirmSchema = z.object({
  gameId: z.string().min(1),
});
