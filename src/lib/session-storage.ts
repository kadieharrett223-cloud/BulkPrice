import { Session } from "@shopify/shopify-api";
import { initDb } from "./db";

// Session storage for OAuth tokens
export class SessionStorage {
  private tableName = "sessions";

  async storeSession(session: Session): Promise<boolean> {
    const db = await initDb();
    
    try {
      // Create sessions table if it doesn't exist
      await db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          shop TEXT NOT NULL,
          state TEXT,
          isOnline INTEGER DEFAULT 0,
          scope TEXT,
          expires INTEGER,
          accessToken TEXT,
          onlineAccessInfo TEXT,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const sessionData = {
        id: session.id,
        shop: session.shop,
        state: session.state || "",
        isOnline: session.isOnline ? 1 : 0,
        scope: session.scope || "",
        expires: session.expires?.getTime() || null,
        accessToken: session.accessToken || "",
        onlineAccessInfo: session.onlineAccessInfo ? JSON.stringify(session.onlineAccessInfo) : null,
        updatedAt: new Date().toISOString(),
      };

      await db.run(
        `INSERT OR REPLACE INTO sessions (id, shop, state, isOnline, scope, expires, accessToken, onlineAccessInfo, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionData.id,
          sessionData.shop,
          sessionData.state,
          sessionData.isOnline,
          sessionData.scope,
          sessionData.expires,
          sessionData.accessToken,
          sessionData.onlineAccessInfo,
          sessionData.updatedAt,
        ]
      );

      return true;
    } catch (error) {
      console.error("Error storing session:", error);
      return false;
    }
  }

  async loadSession(id: string): Promise<Session | undefined> {
    const db = await initDb();
    
    try {
      const row = await db.get("SELECT * FROM sessions WHERE id = ?", [id]);
      
      if (!row) return undefined;

      const session = new Session({
        id: row.id,
        shop: row.shop,
        state: row.state,
        isOnline: row.isOnline === 1,
      });

      if (row.scope) session.scope = row.scope;
      if (row.expires) session.expires = new Date(row.expires);
      if (row.accessToken) session.accessToken = row.accessToken;
      if (row.onlineAccessInfo) {
        session.onlineAccessInfo = JSON.parse(row.onlineAccessInfo);
      }

      return session;
    } catch (error) {
      console.error("Error loading session:", error);
      return undefined;
    }
  }

  async deleteSession(id: string): Promise<boolean> {
    const db = await initDb();
    
    try {
      await db.run("DELETE FROM sessions WHERE id = ?", [id]);
      return true;
    } catch (error) {
      console.error("Error deleting session:", error);
      return false;
    }
  }

  async deleteSessions(ids: string[]): Promise<boolean> {
    const db = await initDb();
    
    try {
      const placeholders = ids.map(() => "?").join(",");
      await db.run(`DELETE FROM sessions WHERE id IN (${placeholders})`, ids);
      return true;
    } catch (error) {
      console.error("Error deleting sessions:", error);
      return false;
    }
  }

  async findSessionsByShop(shop: string): Promise<Session[]> {
    const db = await initDb();
    
    try {
      const rows = await db.all("SELECT * FROM sessions WHERE shop = ?", [shop]);
      
      return rows.map((row: any) => {
        const session = new Session({
          id: row.id,
          shop: row.shop,
          state: row.state,
          isOnline: row.isOnline === 1,
        });

        if (row.scope) session.scope = row.scope;
        if (row.expires) session.expires = new Date(row.expires);
        if (row.accessToken) session.accessToken = row.accessToken;
        if (row.onlineAccessInfo) {
          session.onlineAccessInfo = JSON.parse(row.onlineAccessInfo);
        }

        return session;
      });
    } catch (error) {
      console.error("Error finding sessions:", error);
      return [];
    }
  }
}

export const sessionStorage = new SessionStorage();
