import { describe, expect, it } from "vitest";
import {
  heuristicLeadNoResponseGate,
  staffPromisedLaterReply,
  type LeadGateAnalysis,
} from "@/lib/wa-lead-conversation-gate.server";
import { shouldStartLeadNoResponse, type ConversationAnalysis } from "@/lib/wa-follow-up.server";

function base(over: Partial<ConversationAnalysis> = {}): ConversationAnalysis {
  return {
    conversationId: "c1",
    status: "open",
    closedAt: null,
    firstResponseAt: "2026-07-26T12:00:00.000Z",
    lastPatientReplyAt: "2026-07-26T11:55:00.000Z",
    priceSentAt: null,
    inboundCount: 1,
    outboundStaffCount: 1,
    lastInboundAt: "2026-07-26T11:55:00.000Z",
    lastOutboundStaffAt: "2026-07-26T12:00:00.000Z",
    firstOutboundStaffAt: "2026-07-26T12:00:00.000Z",
    inboundAfterStaffCount: 0,
    lastMessage: {
      direction: "outbound",
      created_at: "2026-07-26T12:00:00.000Z",
      sent_by: "user-1",
      body: "Oi! Como posso ajudar?",
    },
    recentMessages: [
      {
        direction: "inbound",
        created_at: "2026-07-26T11:55:00.000Z",
        sent_by: null,
        body: "Oi, quero agendar",
      },
      {
        direction: "outbound",
        created_at: "2026-07-26T12:00:00.000Z",
        sent_by: "user-1",
        body: "Oi! Como posso ajudar?",
      },
    ],
    ...over,
  };
}

describe("staffPromisedLaterReply", () => {
  it("detects wait / later reply phrases", () => {
    expect(staffPromisedLaterReply([{ body: "Aguarde um momento, já te retorno" }])).toBe(true);
    expect(staffPromisedLaterReply([{ body: "Vou verificar e te chamo" }])).toBe(true);
    expect(staffPromisedLaterReply([{ body: "Oi! Qual horário prefere?" }])).toBe(false);
  });
});

describe("heuristicLeadNoResponseGate", () => {
  it("allows new lead after first staff reply", () => {
    expect(heuristicLeadNoResponseGate(base() as LeadGateAnalysis).eligible).toBe(true);
  });

  it("blocks when reception asked patient to wait", () => {
    const analysis = base({
      lastMessage: {
        direction: "outbound",
        created_at: "2026-07-26T12:00:00.000Z",
        sent_by: "user-1",
        body: "Só um momento, já te retorno com os horários",
      },
      recentMessages: [
        {
          direction: "inbound",
          created_at: "2026-07-26T11:55:00.000Z",
          sent_by: null,
          body: "Tem horário amanhã?",
        },
        {
          direction: "outbound",
          created_at: "2026-07-26T12:00:00.000Z",
          sent_by: "user-1",
          body: "Só um momento, já te retorno com os horários",
        },
      ],
    });
    const gate = heuristicLeadNoResponseGate(analysis as LeadGateAnalysis);
    expect(gate.eligible).toBe(false);
    expect(gate.reason).toBe("equipe_pediu_para_aguardar");
  });
});

describe("shouldStartLeadNoResponse", () => {
  it("starts after reception replies and lead is still silent", () => {
    expect(shouldStartLeadNoResponse(base()).ok).toBe(true);
  });

  it("does not start before staff replies", () => {
    expect(
      shouldStartLeadNoResponse(
        base({
          outboundStaffCount: 0,
          firstOutboundStaffAt: null,
          lastOutboundStaffAt: null,
          firstResponseAt: null,
          lastMessage: {
            direction: "inbound",
            created_at: "2026-07-26T11:55:00.000Z",
            sent_by: null,
            body: "Oi",
          },
        }),
      ).ok,
    ).toBe(false);
  });

  it("does not start after back-and-forth (e.g. staff says obrigado)", () => {
    expect(
      shouldStartLeadNoResponse(
        base({
          inboundCount: 2,
          outboundStaffCount: 2,
          inboundAfterStaffCount: 1,
          lastInboundAt: "2026-07-26T12:10:00.000Z",
          lastOutboundStaffAt: "2026-07-26T12:20:00.000Z",
          firstOutboundStaffAt: "2026-07-26T12:00:00.000Z",
          lastMessage: {
            direction: "outbound",
            created_at: "2026-07-26T12:20:00.000Z",
            sent_by: "user-1",
            body: "Obrigada!",
          },
        }),
      ).ok,
    ).toBe(false);
  });

  it("does not start when staff promised to reply later", () => {
    expect(
      shouldStartLeadNoResponse(
        base({
          lastMessage: {
            direction: "outbound",
            created_at: "2026-07-26T12:00:00.000Z",
            sent_by: "user-1",
            body: "Vou te responder depois, ok?",
          },
          recentMessages: [
            {
              direction: "inbound",
              created_at: "2026-07-26T11:55:00.000Z",
              sent_by: null,
              body: "Oi",
            },
            {
              direction: "outbound",
              created_at: "2026-07-26T12:00:00.000Z",
              sent_by: "user-1",
              body: "Vou te responder depois, ok?",
            },
          ],
        }),
      ).ok,
    ).toBe(false);
  });
});
