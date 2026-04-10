import { type Watchlist, type InsertWatchlist, watchlist } from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  getWatchlist(): Promise<Watchlist[]>;
  addToWatchlist(item: InsertWatchlist): Promise<Watchlist>;
  removeFromWatchlist(ticker: string): Promise<void>;
  isInWatchlist(ticker: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getWatchlist(): Promise<Watchlist[]> {
    return db.select().from(watchlist).all();
  }

  async addToWatchlist(item: InsertWatchlist): Promise<Watchlist> {
    return db.insert(watchlist).values(item).returning().get();
  }

  async removeFromWatchlist(ticker: string): Promise<void> {
    db.delete(watchlist).where(eq(watchlist.ticker, ticker)).run();
  }

  async isInWatchlist(ticker: string): Promise<boolean> {
    const result = db.select().from(watchlist).where(eq(watchlist.ticker, ticker)).get();
    return !!result;
  }
}

export const storage = new DatabaseStorage();
