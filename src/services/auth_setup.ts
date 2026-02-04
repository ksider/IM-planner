import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import type { Db } from "../db.js";
import { findUserByEmail, findUserById, touchLastLogin } from "../repos/users_repo.js";
import { SqliteSessionStore } from "./session_store.js";
import { getAdminSettings } from "../repos/admin_settings_repo.js";

export function configureAuth(app: Express, db: Db) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is required to start the server.");
  }

  const settings = getAdminSettings(db);
  const cookieSecure = settings.require_https === 1 || process.env.NODE_ENV === "production";

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new SqliteSessionStore(db),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure
      }
    })
  );

  passport.use(
    new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
      const user = findUserByEmail(db, email.trim().toLowerCase());
      if (!user) return done(null, false, { message: "Invalid email or password." });
      if (user.status !== "ACTIVE") return done(null, false, { message: "User is disabled." });
      if (!user.password_hash) return done(null, false, { message: "Password login not enabled." });
      const ok = bcrypt.compareSync(password, user.password_hash);
      if (!ok) return done(null, false, { message: "Invalid email or password." });
      touchLastLogin(db, user.id);
      return done(null, user);
    })
  );

  passport.serializeUser((user, done) => {
    done(null, (user as { id: number }).id);
  });

  passport.deserializeUser((id: number, done) => {
    const user = findUserById(db, id);
    if (!user) return done(null, false);
    return done(null, user);
  });

  app.use(passport.initialize());
  app.use(passport.session());
}
