import { NextRequest, NextResponse } from "next/server";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "trashmail.com",
]);

function hasSequentialDigits(input: string) {
  return (
    input.includes("012345") ||
    input.includes("123456") ||
    input.includes("234567") ||
    input.includes("345678") ||
    input.includes("456789")
  );
}

const RegisterSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80),
    phoneNumber: z.string().trim().regex(/^[+]?[0-9\s\-()]{10,20}$/),
    companyName: z.string().trim().min(2).max(120).optional(),
    jobTitle: z.string().trim().min(2).max(120).optional(),
    country: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/, "Password must include uppercase")
      .regex(/[a-z]/, "Password must include lowercase")
      .regex(/[0-9]/, "Password must include a number"),
  })
  .superRefine((data, ctx) => {
    const normalizedEmail = data.email.toLowerCase();
    const domain = normalizedEmail.split("@")[1] ?? "";
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["email"],
        message: "Disposable email addresses are not allowed",
      });
    }

    if (/\d/.test(data.fullName) || !/^[a-zA-Z\s.'-]+$/.test(data.fullName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullName"],
        message: "Enter a valid full name",
      });
    }

    const lowerName = data.fullName.toLowerCase();
    if (["test", "dummy", "unknown", "na", "n/a", "asdf"].some((bad) => lowerName.includes(bad))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fullName"],
        message: "Use your real full name",
      });
    }

    const digitsOnlyPhone = data.phoneNumber.replace(/\D/g, "");
    if (digitsOnlyPhone.length < 10 || digitsOnlyPhone.length > 15) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "Enter a valid phone number",
      });
    }
    if (/^(\d)\1+$/.test(digitsOnlyPhone) || hasSequentialDigits(digitsOnlyPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "Phone number appears invalid",
      });
    }

    if (data.companyName) {
      const c = data.companyName.toLowerCase();
      if (["test", "dummy", "none", "na", "n/a"].includes(c)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyName"],
          message: "Enter a valid company name",
        });
      }
    }

    const lowerPass = data.password.toLowerCase();
    if (["password", "qwerty", "123456", "letmein"].some((weak) => lowerPass.includes(weak))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is too weak",
      });
    }
  });

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null);
    const parsed = RegisterSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
    }
    const { fullName, phoneNumber, companyName, jobTitle, country, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    // Try enriched profile fields first (if DB migration exists), fallback to base fields.
    const user = await prisma.user
      .create({
        data: {
          email: normalizedEmail,
          passwordHash,
          ...( {
            fullName,
            phoneNumber,
            companyName: companyName ?? null,
            jobTitle: jobTitle ?? null,
            country,
          } as Record<string, unknown> ),
        } as any,
      })
      .catch(async () => {
        return prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
          },
        });
      });

    // Create session token
    const sessionToken = await createSessionToken({ sub: user.id, email: user.email });

    const response = NextResponse.json({ success: true });
    await setSessionCookie(sessionToken);

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}