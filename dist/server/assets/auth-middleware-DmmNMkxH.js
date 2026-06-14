import { c as createMiddleware, g as getRequest } from "./server-DiyCfIqC.js";
import { createClient } from "@supabase/supabase-js";
const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...!SUPABASE_URL ? ["SUPABASE_URL"] : [],
        ...!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []
      ];
      const message = `Variável(is) de ambiente do Supabase ausente(s): ${missing.join(", ")}. Configure-as no arquivo .env (veja .env.example).`;
      console.error(`[Supabase] ${message}`);
      throw new Error(message);
    }
    const request = getRequest();
    if (!request?.headers) {
      throw new Error("Não autorizado: cabeçalhos da requisição indisponíveis");
    }
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Não autorizado: cabeçalho de autorização não informado");
    }
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Não autorizado: apenas tokens Bearer são aceitos");
    }
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      throw new Error("Não autorizado: token não informado");
    }
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          storage: void 0,
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      throw new Error("Não autorizado: token inválido");
    }
    if (!data.claims.sub) {
      throw new Error("Não autorizado: ID do usuário não encontrado no token");
    }
    return next({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims
      }
    });
  }
);
export {
  requireSupabaseAuth as r
};
