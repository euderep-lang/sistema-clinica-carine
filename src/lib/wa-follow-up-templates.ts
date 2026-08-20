import { SAME_DAY_MORNING_REMINDER_DELAY_MINUTES } from "@/lib/wa-appointment-reminders";
import { normalizeGenderInTemplate } from "@/lib/wa-template-gender";

export type FollowUpMode = "auto" | "manual";

export const FOLLOW_UP_VARIANT_COUNT = 5;

export type FollowUpStepDef = {
  key: string;
  /** Rótulo curto na UI (quando omitido, usa o delay). */
  label?: string;
  delayMinutes: number;
  mode: FollowUpMode;
  /** Sempre 5 variações (índices 0–4). */
  templates: string[];
};

/** Compat: primeiro texto da lista. */
export function primaryTemplate(step: Pick<FollowUpStepDef, "templates">): string {
  return step.templates[0] ?? "";
}

export const WA_FOLLOW_UP_TEMPLATES_KEY = "wa_follow_up_templates";
export const WA_AFTER_HOURS_MESSAGE_KEY = "wa_after_hours_message";

export const FOLLOW_UP_SEQUENCE_META: Record<string, { label: string; description: string }> = {
  lead_no_response: {
    label: "Lead sem resposta",
    description:
      "Só em conversa nova: recepção respondeu e o lead sumiu. Antes de cada envio analisa a CV (não dispara se já houve vai-e-volta ou se a equipe pediu para aguardar / disse que responde depois). Se o lead responder, interrompe.",
  },
  lead_price_sent: {
    label: "Após envio de preço",
    description: "Desativado — não envia mais follow-up automático após valor/orçamento.",
  },
  appointment_booked: {
    label: "Consulta agendada",
    description:
      "Imediato na hora do agendamento; D-1 só se a consulta não for amanhã. No dia: consulta 7h–10h não envia; após as 10h, lembrete às 8h e outro 3h antes (se esse horário for depois das 8h). Envios só entre 7h e 20h. Envia mesmo se o paciente interagir no WhatsApp.",
  },
  post_consultation: {
    label: "Pós-consulta",
    description:
      "1 dia depois: sempre, mesmo com interação no WhatsApp. 7, 15 e 30 dias: só se não houver outra consulta desde a original, se não houver consulta agendada na semana (seg–dom) e se a conversa não estiver ativa. 5 variações por passo.",
  },
  no_show: {
    label: "Falta na consulta",
    description:
      "Ao marcar Faltou: 2h depois (sempre) e 1 dia depois só se o paciente não respondeu no WhatsApp. 5 variações por passo.",
  },
  reactivation: {
    label: "Reativação",
    description:
      "30, 60 e 90 dias após a consulta concluída. Só envia se o paciente não interagiu no WhatsApp nem teve consulta nesse período (aniversário automático não conta). Reinicia a cada nova consulta concluída.",
  },
  objection_vou_pensar: {
    label: "Objeção — Vou pensar",
    description: "Sugestão ao marcar objeção. 5 variações em rotação.",
  },
  objection_achei_caro: {
    label: "Objeção — Achei caro",
    description: "Sugestão ao marcar objeção. 5 variações em rotação.",
  },
  objection_preciso_agenda: {
    label: "Objeção — Preciso ver agenda",
    description: "Sugestão ao marcar objeção. 5 variações em rotação.",
  },
  objection_medo_hormonio: {
    label: "Objeção — Medo de hormônio",
    description: "Sugestão ao marcar objeção. 5 variações em rotação.",
  },
};

/** Garante exatamente 5 strings (preenche com o último / defaults). */
export function padTemplatesToFive(
  values: Array<string | null | undefined>,
  fallback: string[] = [],
): string[] {
  const cleaned = values.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
  const base = cleaned.length > 0 ? cleaned : fallback.map((f) => f.trim()).filter(Boolean);
  if (base.length === 0) {
    return Array.from({ length: FOLLOW_UP_VARIANT_COUNT }, () => "");
  }
  const out: string[] = [];
  for (let i = 0; i < FOLLOW_UP_VARIANT_COUNT; i++) {
    out.push(base[i] ?? base[base.length - 1]!);
  }
  return out;
}

function five(...variants: [string, string, string, string, string]): string[] {
  return variants;
}

export const FOLLOW_UP_SEQUENCE_DEFAULTS: Record<string, FollowUpStepDef[]> = {
  lead_no_response: [
    {
      key: "lead_no_response_15m",
      delayMinutes: 15,
      mode: "auto",
      templates: five(
        "Oi, {{primeiro_nome}}! Vi que nossa conversa ficou pela metade.\n\nPara eu te orientar melhor, o que você está buscando neste momento: uma avaliação, um acompanhamento ou apenas informações sobre a clínica?",
        "{{primeiro_nome}}, ficou alguma dúvida sobre o que te expliquei?\n\nMe conta brevemente o que fez você procurar a clínica hoje. Assim consigo direcionar sua conversa da forma certa.",
        "Oi, {{primeiro_nome}}!\n\nAntes de te passar mais informações, preciso entender uma coisa: você está procurando atendimento para você ou para outra pessoa?",
        "{{primeiro_nome}}, posso te ajudar a encontrar o atendimento mais adequado, mas preciso entender um pouco melhor sua necessidade.\n\nQual foi o principal motivo que levou você a nos chamar?",
        "Oi, {{primeiro_nome}}! Ainda está por aí?\n\nVocê já sabe qual profissional ou área procura, ou gostaria que eu te ajudasse a identificar o atendimento mais indicado?",
      ),
    },
    {
      key: "lead_no_response_4h",
      delayMinutes: 240,
      mode: "auto",
      templates: five(
        "{{primeiro_nome}}, passando novamente porque talvez você tenha chamado em um momento corrido.\n\nExiste alguma dúvida específica que está impedindo você de avançar: valores, horários, localização ou como funciona o atendimento?",
        "Oi, {{primeiro_nome}}!\n\nNormalmente, quem fala conosco está tentando entender se o atendimento realmente faz sentido para o que precisa.\n\nO que você gostaria de esclarecer antes de decidir?",
        "{{primeiro_nome}}, uma pergunta rápida: o que é mais importante para você neste momento — encontrar o profissional certo, entender como funciona a consulta ou verificar disponibilidade?",
        "Oi, {{primeiro_nome}}!\n\nÀs vezes, a pessoa recebe as informações, mas ainda fica com alguma insegurança antes de marcar.\n\nTem algum ponto que não ficou claro para você?",
        "{{primeiro_nome}}, para eu não ficar enviando informações que talvez não sejam úteis, me diga apenas uma coisa:\n\nO que você precisa saber para decidir se deseja continuar o atendimento conosco?",
      ),
    },
    {
      key: "lead_no_response_24h",
      delayMinutes: 1440,
      mode: "auto",
      templates: five(
        "Oi, {{primeiro_nome}}!\n\nOntem você entrou em contato conosco, mas não conseguimos concluir sua orientação.\n\nO que você está buscando resolver já vem incomodando há algum tempo ou surgiu recentemente?",
        "{{primeiro_nome}}, posso fazer uma pergunta direta?\n\nEssa questão que levou você a procurar atendimento está afetando sua rotina, seu bem-estar ou sua qualidade de vida de alguma forma?",
        "Oi, {{primeiro_nome}}!\n\nMuitas pessoas adiam uma avaliação porque ainda não sabem exatamente por onde começar.\n\nHoje, o que mais dificulta você dar o próximo passo?",
        "{{primeiro_nome}}, quero entender se ainda faz sentido continuar essa conversa.\n\nO atendimento era apenas uma pesquisa ou você realmente está buscando ajuda para alguma necessidade atual?",
        "Oi, {{primeiro_nome}}!\n\nQuando uma questão de saúde permanece sem orientação, é comum a pessoa continuar tentando resolver sozinha e ficar ainda mais confusa.\n\nVocê já tentou alguma abordagem antes ou seria sua primeira avaliação?",
      ),
    },
    {
      key: "lead_no_response_3d",
      delayMinutes: 4320,
      mode: "auto",
      templates: five(
        "{{primeiro_nome}}, vou ser objetiva para não tomar seu tempo.\n\nVocê gostaria que eu verificasse um horário para uma avaliação ou prefere apenas receber mais informações antes de decidir?",
        "Oi, {{primeiro_nome}}!\n\nSe uma avaliação profissional ajudasse você a entender melhor o que está acontecendo e quais seriam os próximos passos, faria sentido reservar um horário?",
        "{{primeiro_nome}}, ainda consigo ajudar você a organizar esse atendimento.\n\nO que seria mais útil agora: conhecer os horários disponíveis ou esclarecer alguma dúvida específica antes?",
        "Oi, {{primeiro_nome}}!\n\nTalvez você ainda não tenha respondido porque não tem certeza se esse é o momento certo.\n\nO que falta para você se sentir seguro para avançar?",
        "{{primeiro_nome}}, sua conversa ficou aberta por aqui.\n\nVocê quer continuar buscando uma solução para essa necessidade ou prefere deixar o atendimento para outro momento?",
      ),
    },
    {
      key: "lead_no_response_7d",
      delayMinutes: 10080,
      mode: "auto",
      templates: five(
        "Oi, {{primeiro_nome}}!\n\nComo não tivemos retorno, vou encerrar seu atendimento por aqui para não continuar enviando mensagens.\n\nCaso ainda queira informações ou deseje agendar, basta responder a esta conversa. 💚",
        "{{primeiro_nome}}, percebi que talvez este não seja o melhor momento para você.\n\nVou finalizar nosso contato, mas, quando decidir cuidar dessa questão, nossa equipe estará disponível para orientar você.",
        "Oi, {{primeiro_nome}}!\n\nAntes de encerrar, preciso saber apenas uma coisa: você perdeu o interesse ou ainda pretende continuar essa conversa em outro momento?\n\nPode responder somente com: agora ou depois.",
        "{{primeiro_nome}}, não quero ser inconveniente, então esta será minha última mensagem sobre seu atendimento.\n\nCaso ainda tenha interesse, responda por aqui e retomamos exatamente de onde paramos.",
        "Oi, {{primeiro_nome}}!\n\nVou encerrar sua solicitação por falta de retorno.\n\nSe ainda estiver buscando atendimento, responda apenas “quero continuar” e nossa equipe dará sequência à sua orientação.",
      ),
    },
  ],
  lead_price_sent: [
    {
      key: "lead_price_sent_30m",
      delayMinutes: 30,
      mode: "auto",
      templates: five(
        "{{primeiro_nome}}, ficou alguma dúvida sobre o valor ou sobre como funciona a consulta? Posso te explicar de forma simples.",
        "Oi, {{primeiro_nome}}. Alguma dúvida sobre o valor ou o que está incluso na consulta? Posso esclarecer.",
        "{{primeiro_nome}}, passando para saber se ficou claro o investimento e o que a consulta contempla.",
        "Tudo bem, {{primeiro_nome}}? Se surgiu dúvida sobre preço ou formato do atendimento, me fala.",
        "{{primeiro_nome}}, estou por aqui caso queira tirar dúvida sobre o valor ou o passo a passo da consulta.",
      ),
    },
    {
      key: "lead_price_sent_24h",
      delayMinutes: 1440,
      mode: "auto",
      templates: five(
        "Só reforçando, {{primeiro_nome}}: a consulta não é apenas uma conversa rápida. A ideia é investigar exames, sintomas, rotina, composição corporal e montar uma conduta individualizada para o seu caso, está bem?",
        "{{primeiro_nome}}, vale lembrar: a consulta é investigação completa — exames, sintomas, rotina e conduta sob medida para você.",
        "Oi, {{primeiro_nome}}. O valor contempla avaliação aprofundada, não um atendimento superficial. Faz sentido te explicar melhor o que entra?",
        "{{primeiro_nome}}, reforço que montamos conduta individualizada a partir de exames e da sua rotina. Qualquer dúvida, me chama.",
        "Passando, {{primeiro_nome}}: o atendimento é estratégico e personalizado. Se quiser detalhes do que está incluso, estou aqui.",
      ),
    },
    {
      key: "lead_price_sent_48h",
      delayMinutes: 2880,
      mode: "auto",
      templates: five(
        "Oii, {{primeiro_nome}}. Se o que te travou foi o valor, me fala com sinceridade. Às vezes consigo te orientar sobre a melhor forma de iniciar sem você ficar {{perdido}}.",
        "{{primeiro_nome}}, se o investimento pesou, pode falar aberto. Posso te ajudar a ver a melhor forma de começar sem ficar {{perdido}}.",
        "Oi, {{primeiro_nome}}. Entendo se o valor gerou dúvida. Me conta o que travou que eu te oriento.",
        "{{primeiro_nome}}, sem pressão: se foi o preço, conversamos. Quero que você se sinta seguro(a) para decidir.",
        "Passando, {{primeiro_nome}}. Se o valor foi o ponto, me fala. Às vezes há um caminho melhor para iniciar sem você ficar {{perdido}}.",
      ),
    },
    {
      key: "lead_price_sent_5d",
      delayMinutes: 7200,
      mode: "auto",
      templates: five(
        "Continuar tentando sozinha pode sair mais caro do que investigar corretamente. Quando quiser dar esse passo com estratégia, me chama por aqui. Muito obrigada, {{primeiro_nome}}.",
        "{{primeiro_nome}}, insistir sem investigação às vezes custa mais. Quando quiser um caminho estratégico, estou por aqui. Obrigada!",
        "Oi, {{primeiro_nome}}. Se fizer sentido investigar com método, me chama. Fico à disposição.",
        "{{primeiro_nome}}, deixo o convite aberto: quando quiser avançar com avaliação, responda aqui. Obrigada!",
        "Quando estiver pronto(a) para um passo mais estruturado, {{primeiro_nome}}, me fala. Será um prazer ajudar.",
      ),
    },
  ],
  appointment_booked: [
    {
      key: "appointment_booked_now",
      label: "No momento do agendamento",
      delayMinutes: 0,
      mode: "auto",
      templates: five(
        "Oi, {{primeiro_nome}}, sua consulta ficou agendada para {{data_consulta}} às {{hora_consulta}}. Para aproveitar melhor, traga seus exames recentes, lista de medicamentos/suplementos e anote suas principais queixas.",
        "Olá, {{primeiro_nome}}! Consulta marcada para {{data_consulta}} às {{hora_consulta}}. Se puder, leve exames recentes, lista de remédios/suplementos e as queixas principais.",
        "{{primeiro_nome}}, confirmado: {{data_consulta}} às {{hora_consulta}}. Para o atendimento render mais, traga exames, medicamentos em uso e um resumo das queixas.",
        "Oi, {{primeiro_nome}}. Sua consulta está em {{data_consulta}} às {{hora_consulta}}, com {{nome_profissional}}. Traga exames recentes e anote o que mais te incomoda.",
        "{{primeiro_nome}}, agendamento feito para {{data_consulta}} às {{hora_consulta}}. Chegue com exames (se tiver), lista de medicamentos e suas dúvidas principais. Até lá!",
      ),
    },
    {
      key: "appointment_reminder_24h",
      label: "Lembrete — 1 dia antes",
      delayMinutes: -1440,
      mode: "auto",
      templates: five(
        "Confirmando sua consulta amanhã às {{hora_consulta}}, {{primeiro_nome}}. Responda \"eu vou\" para manter seu horário reservado.",
        "Oi, {{primeiro_nome}}! Lembrete: amanhã às {{hora_consulta}}. Confirma com \"eu vou\" para garantir a vaga?",
        "{{primeiro_nome}}, sua consulta é amanhã às {{hora_consulta}}. Pode responder \"eu vou\" para confirmarmos?",
        "Passando para confirmar: amanhã, {{hora_consulta}}, {{primeiro_nome}}. Responda \"eu vou\" se estiver tudo certo.",
        "{{primeiro_nome}}, amanhã te esperamos às {{hora_consulta}}. Confirme com \"eu vou\", por favor.",
      ),
    },
    {
      key: "appointment_reminder_morning",
      label: "Lembrete no dia — 8h da manhã",
      delayMinutes: SAME_DAY_MORNING_REMINDER_DELAY_MINUTES,
      mode: "auto",
      templates: five(
        "Bom dia, {{primeiro_nome}}! Sua consulta é hoje às {{hora_consulta}}. Se precisar remarcar, nos avise por aqui.",
        "Oi, {{primeiro_nome}}! Passando cedo para lembrar: hoje às {{hora_consulta}} te esperamos. Qualquer imprevisto, fale comigo.",
        "{{primeiro_nome}}, bom dia! Consulta hoje às {{hora_consulta}}. Estamos te esperando — qualquer mudança, me chama.",
        "Bom dia, {{primeiro_nome}}. Lembrete: sua consulta é hoje, {{hora_consulta}}. Até lá!",
        "{{primeiro_nome}}, sua consulta é hoje às {{hora_consulta}}. Bom dia e até mais tarde!",
      ),
    },
    {
      key: "appointment_reminder_3h",
      label: "Lembrete no dia — 3h antes",
      delayMinutes: -180,
      mode: "auto",
      templates: five(
        "{{primeiro_nome}}, sua consulta é hoje às {{hora_consulta}}. Chegue com alguns minutos de antecedência e traga seus exames, se tiver. Te vejo lá!",
        "Oi, {{primeiro_nome}}! Hoje às {{hora_consulta}} é sua consulta. Chegue um pouco antes e leve exames, se tiver. Até já!",
        "{{primeiro_nome}}, lembrete: consulta hoje às {{hora_consulta}}. Antecipe alguns minutos e traga exames recentes, se houver.",
        "Hoje é o dia, {{primeiro_nome}} — {{hora_consulta}}. Te esperamos com um tempinho de antecedência. Até logo!",
        "{{primeiro_nome}}, falta pouco: consulta às {{hora_consulta}}. Chegue com calma e, se puder, traga exames. Te vejo em breve!",
      ),
    },
  ],
  post_consultation: [
    {
      key: "post_consultation_24h",
      delayMinutes: 1440,
      mode: "auto",
      templates: five(
        "Oi, {{primeiro_nome}}. Passando para saber como você ficou após a consulta de ontem com a {{nome_profissional}}. Conseguiu entender bem a conduta e os próximos passos? Se surgiu alguma dúvida inicial, pode me enviar por aqui.",
        "Olá, {{primeiro_nome}}! Como você está após a consulta de ontem com a {{nome_profissional}}? Ficou alguma dúvida sobre a conduta?",
        "{{primeiro_nome}}, passando no dia seguinte à consulta. A conduta ficou clara? Qualquer dúvida, me manda por aqui.",
        "Oi, {{primeiro_nome}}. Tudo bem depois da consulta com a {{nome_profissional}}? Se precisar de algum esclarecimento inicial, estou disponível.",
        "{{primeiro_nome}}, checando como você ficou após o atendimento de ontem. Entendeu bem os próximos passos? Pode falar comigo aqui.",
      ),
    },
    {
      key: "post_consultation_7d",
      delayMinutes: 10080,
      mode: "auto",
      templates: five(
        "Oi, {{primeiro_nome}}. Já se passaram alguns dias desde a consulta. Como você está se sentindo? Alguma dificuldade com alimentação, medicação, suplementação ou rotina?",
        "{{primeiro_nome}}, uma semana depois da consulta: como está se sentindo? Algo travou na rotina, medicação ou alimentação?",
        "Passando, {{primeiro_nome}}. Como está a adaptação pós-consulta? Conta se surgiu alguma dificuldade.",
        "Oi, {{primeiro_nome}}! Queria saber da sua evolução nesses dias. Alimentação, sono ou suplementos estão ok?",
        "{{primeiro_nome}}, checando sua semana após a consulta. Como você está? Pode me contar o que está mais difícil.",
      ),
    },
    {
      key: "post_consultation_15d",
      delayMinutes: 21600,
      mode: "auto",
      templates: five(
        "{{primeiro_nome}}, passando para acompanhar sua evolução. O mais importante nessa fase não é perfeição, é aderência. Me diga: de 0 a 10, quanto você está se sentindo? Me conte tudo.",
        "Oi, {{primeiro_nome}}. Quinze dias de caminho: de 0 a 10, como você se sente? Pode detalhar o que melhorou ou ainda incomoda.",
        "{{primeiro_nome}}, acompanhamento de meia etapa. Como está a aderência? Nota de 0 a 10 e um resumo do que sente?",
        "Passando, {{primeiro_nome}}. Nesta fase vale constância mais que perfeição. Como você está de 0 a 10?",
        "{{primeiro_nome}}, quero ouvir sua evolução. De 0 a 10, como está se sentindo? Me conta com sinceridade.",
      ),
    },
    {
      key: "post_consultation_30d",
      delayMinutes: 43200,
      mode: "auto",
      templates: five(
        "Já temos um mês desde a consulta, {{primeiro_nome}}. Esse é um bom momento para ajustar o que não encaixou bem na rotina. Como estão energia, fome, sono, disposição e medidas?",
        "{{primeiro_nome}}, um mês de acompanhamento. O que precisa ajustar? Energia, sono, fome e disposição como estão?",
        "Oi, {{primeiro_nome}}. Fechando o primeiro mês: o que encaixou e o que ainda emperra na rotina?",
        "{{primeiro_nome}}, momento de revisão. Como estão sono, energia, apetite e medidas? Podemos afinar a conduta.",
        "Passando no marco de 30 dias, {{primeiro_nome}}. Conta como está se sentindo e o que quer ajustar.",
      ),
    },
  ],
  no_show: [
    {
      key: "no_show_2h",
      delayMinutes: 120,
      mode: "auto",
      templates: five(
        "Oi, {{primeiro_nome}}. Vi que você não conseguiu comparecer à consulta de hoje. Aconteceu algum imprevisto?",
        "{{primeiro_nome}}, sentimos sua falta hoje. Rolou algum imprevisto com o horário?",
        "Oi, {{primeiro_nome}}. Notamos que não foi possível vir à consulta. Está tudo bem?",
        "{{primeiro_nome}}, passando porque você não chegou hoje. Posso te ajudar a remarcar se precisar.",
        "Olá, {{primeiro_nome}}. Vimos a falta no horário de hoje. Aconteceu alguma coisa?",
      ),
    },
    {
      key: "no_show_next_day",
      delayMinutes: 1440,
      mode: "auto",
      templates: five(
        "{{primeiro_nome}}, posso verificar uma nova possibilidade de horário para você. Quer que eu veja a próxima agenda disponível?",
        "Oi, {{primeiro_nome}}. Quer que eu busque um novo horário na agenda?",
        "{{primeiro_nome}}, posso te oferecer novas opções de consulta. Te interessa?",
        "Passando, {{primeiro_nome}}: posso remarcar quando for melhor para você. Quer que eu veja a agenda?",
        "{{primeiro_nome}}, se quiser remarcar, me avisa que eu vejo os próximos horários livres.",
      ),
    },
  ],
  reactivation: [
    {
      key: "reactivation_30d",
      delayMinutes: 43200,
      mode: "auto",
      templates: five(
        "Oi, {{primeiro_nome}}! Faz um tempo que não nos falamos. Como você está? Se quiser retomar seu acompanhamento, estou à disposição.",
        "Olá, {{primeiro_nome}}. Sentimos sua falta por aqui. Como tem passado? Se quiser retomar, me chama.",
        "{{primeiro_nome}}, passando para saber como você está. Quando quiser voltar ao acompanhamento, estamos prontos.",
        "Oi, {{primeiro_nome}}! Tudo bem? Se fizer sentido retomar os cuidados, é só responder.",
        "{{primeiro_nome}}, um oi carinhoso depois de um tempo. Como você está? Posso te ajudar a retomar.",
      ),
    },
    {
      key: "reactivation_60d",
      delayMinutes: 86400,
      mode: "auto",
      templates: five(
        "{{primeiro_nome}}, passando para saber se ainda faz sentido cuidarmos da sua saúde com estratégia. Posso te ajudar a retomar?",
        "Oi, {{primeiro_nome}}. Ainda faz sentido um acompanhamento estruturado? Posso te orientar a voltar.",
        "{{primeiro_nome}}, checando se quer retomar o cuidado com a gente. Estou à disposição.",
        "Passando, {{primeiro_nome}}: se quiser retomar com estratégia, me fala que eu te ajudo.",
        "{{primeiro_nome}}, quando quiser voltar a cuidar de você com método, pode contar comigo.",
      ),
    },
    {
      key: "reactivation_90d",
      delayMinutes: 129600,
      mode: "auto",
      templates: five(
        "Último contato por aqui, {{primeiro_nome}}. Quando quiser voltar a cuidar de você com acompanhamento médico, é só me chamar.",
        "{{primeiro_nome}}, deixo este último toque. Se quiser retomar o acompanhamento, estou por aqui.",
        "Fechando o ciclo de contato, {{primeiro_nome}}. Quando fizer sentido voltar, me chama.",
        "Oi, {{primeiro_nome}}. Última mensagem deste período — a porta continua aberta para seu retorno.",
        "{{primeiro_nome}}, quando quiser retomar a avaliação médica, é só responder. Cuide-se!",
      ),
    },
  ],
  objection_vou_pensar: [
    {
      key: "objection_vou_pensar",
      delayMinutes: 0,
      mode: "manual",
      templates: five(
        "Claro, {{primeiro_nome}}. Para eu conseguir te ajudar melhor: o que você sente que ainda precisa avaliar antes de decidir?\n\nPode ser valor, disponibilidade, segurança sobre o atendimento ou alguma dúvida que ainda não ficou clara.",
        "Sem problema, {{primeiro_nome}}.\n\nSó não quero que você fique com alguma dúvida importante sem resposta. O que mais está pesando na sua decisão neste momento?",
        "Entendi, {{primeiro_nome}}. Pensar com calma é importante.\n\nVocê está em dúvida se o atendimento faz sentido para o que precisa ou se este é o melhor momento para começar?",
        "Claro, {{primeiro_nome}}.\n\nNormalmente, quando alguém diz que vai pensar, ainda existe algum ponto que precisa ser esclarecido. No seu caso, qual seria esse ponto?",
        "Tudo bem, {{primeiro_nome}}.\n\nAntes de encerrarmos, posso te fazer uma pergunta direta? O que precisaria acontecer para você se sentir seguro em avançar com o atendimento?",
      ),
    },
  ],
  objection_achei_caro: [
    {
      key: "objection_achei_caro",
      delayMinutes: 0,
      mode: "manual",
      templates: five(
        "Entendo, {{primeiro_nome}}. Para eu compreender melhor: você achou o valor acima do que imaginava ou está comparando com outro tipo de atendimento?\n\nAssim consigo explicar com mais clareza o que está incluído.",
        "Certo, {{primeiro_nome}}. O valor é um ponto importante.\n\nSua principal preocupação é o investimento neste momento ou você ainda não conseguiu perceber se o atendimento entrega o que você procura?",
        "Entendi, {{primeiro_nome}}.\n\nMais do que discutir preço, quero entender se o atendimento faz sentido para sua necessidade. O que você considera indispensável em um acompanhamento médico para sentir que vale o investimento?",
        "Claro, {{primeiro_nome}}. Posso te perguntar uma coisa?\n\nEssa questão que levou você a procurar atendimento já vem gerando gastos, tentativas sem resultado ou impacto na sua rotina?",
        "Entendo sua colocação, {{primeiro_nome}}.\n\nO investimento precisa fazer sentido para você. O que ainda falta compreender sobre a consulta, o acompanhamento ou a proposta para conseguir avaliar melhor o valor?",
      ),
    },
  ],
  objection_preciso_agenda: [
    {
      key: "objection_preciso_agenda",
      delayMinutes: 0,
      mode: "manual",
      templates: five(
        "Claro, {{primeiro_nome}}.\n\nQuais dias ou períodos costumam ser mais tranquilos para você? Posso verificar as opções e deixar algumas possibilidades separadas.",
        "Sem problema, {{primeiro_nome}}.\n\nPara facilitar, você prefere atendimento pela manhã, à tarde ou no início da noite?",
        "Entendi, {{primeiro_nome}}.\n\nSua agenda costuma ser mais previsível durante a semana ou você precisa verificar mais próximo da data?",
        "Claro, {{primeiro_nome}}.\n\nPosso te enviar duas ou três opções de horários para você comparar com sua agenda, em vez de precisar procurar uma data sozinho.",
        "Tudo bem, {{primeiro_nome}}.\n\nQual é a maior dificuldade neste momento: encontrar um dia livre ou conciliar o horário do atendimento com sua rotina?",
      ),
    },
  ],
  objection_medo_hormonio: [
    {
      key: "objection_medo_hormonio",
      delayMinutes: 0,
      mode: "manual",
      templates: five(
        "Seu receio é válido, {{primeiro_nome}}.\n\nO que mais preocupa você quando pensa em hormônios: efeitos colaterais, dependência, ganho de peso ou alguma experiência anterior?",
        "Entendo, {{primeiro_nome}}. Muitas pessoas chegam com esse mesmo receio.\n\nVocê já teve alguma experiência negativa com hormônios ou esse medo vem principalmente de informações que ouviu?",
        "Certo, {{primeiro_nome}}.\n\nA consulta não significa que você será obrigado a usar hormônios. Primeiro é feita uma avaliação para entender sintomas, histórico, exames, riscos e alternativas.\n\nQual é o seu principal medo em relação ao tratamento?",
        "{{primeiro_nome}}, seu receio precisa ser levado a sério, não ignorado.\n\nO que faria você se sentir mais seguro: entender as indicações, conhecer os riscos ou saber quais alternativas existem?",
        "Entendo, {{primeiro_nome}}.\n\nMais importante do que decidir antecipadamente se vai usar hormônio é descobrir se existe indicação e quais opções são adequadas para o seu caso.\n\nVocê gostaria de fazer uma avaliação sem compromisso de iniciar qualquer tratamento?",
      ),
    },
  ],
};

/** Ordem de exibição nas configurações. */
export const FOLLOW_UP_SEQUENCE_ORDER = [
  "lead_no_response",
  "appointment_booked",
  "post_consultation",
  "no_show",
  "reactivation",
  "objection_vou_pensar",
  "objection_achei_caro",
  "objection_preciso_agenda",
  "objection_medo_hormonio",
] as const;

/** Overrides: string legada ou array de até 5 textos. */
export type FollowUpTemplateOverrideValue = string | string[];
export type FollowUpTemplateOverrides = Record<string, Record<string, FollowUpTemplateOverrideValue>>;

/** Estado do editor: sempre 5 strings por passo. */
export type FollowUpTemplatesEditState = Record<string, Record<string, string[]>>;

function normalizeOverrideToFive(
  override: FollowUpTemplateOverrideValue | undefined,
  defaults: string[],
): string[] {
  if (override == null) {
    return padTemplatesToFive(defaults).map((t) => normalizeGenderInTemplate(t));
  }
  if (typeof override === "string") {
    const t = normalizeGenderInTemplate(override.trim());
    if (!t) return padTemplatesToFive(defaults).map((x) => normalizeGenderInTemplate(x));
    // Legado: um texto custom vira variação 1; demais ficam nos defaults.
    return padTemplatesToFive([t, ...defaults.slice(1)], defaults).map((x) =>
      normalizeGenderInTemplate(x),
    );
  }
  const cleaned = override.map((s) => normalizeGenderInTemplate(String(s ?? "").trim()));
  return padTemplatesToFive(cleaned, defaults).map((x) => normalizeGenderInTemplate(x));
}

export function mergeFollowUpSequences(
  overrides: FollowUpTemplateOverrides | null | undefined,
): Record<string, FollowUpStepDef[]> {
  const result: Record<string, FollowUpStepDef[]> = {};
  for (const [sequenceKey, steps] of Object.entries(FOLLOW_UP_SEQUENCE_DEFAULTS)) {
    const seqOverrides = overrides?.[sequenceKey];
    result[sequenceKey] = steps.map((step) => ({
      ...step,
      templates: normalizeOverrideToFive(seqOverrides?.[step.key], step.templates),
    }));
  }
  return result;
}

export function templatesToOverrides(edited: FollowUpTemplatesEditState): FollowUpTemplateOverrides {
  const out: FollowUpTemplateOverrides = {};
  for (const [sequenceKey, steps] of Object.entries(FOLLOW_UP_SEQUENCE_DEFAULTS)) {
    const seqEdited = edited[sequenceKey];
    if (!seqEdited) continue;
    for (const step of steps) {
      const editedVariants = padTemplatesToFive(
        (seqEdited[step.key] ?? []).map((s) => normalizeGenderInTemplate(s.trim())),
        step.templates,
      );
      const defaults = padTemplatesToFive(step.templates);
      const changed = editedVariants.some((v, i) => v !== defaults[i]);
      if (!changed) continue;
      if (!out[sequenceKey]) out[sequenceKey] = {};
      out[sequenceKey][step.key] = editedVariants;
    }
  }
  return out;
}

export function mergedTemplatesForEditing(
  overrides: FollowUpTemplateOverrides | null | undefined,
): FollowUpTemplatesEditState {
  const merged = mergeFollowUpSequences(overrides);
  const out: FollowUpTemplatesEditState = {};
  for (const [sequenceKey, steps] of Object.entries(merged)) {
    out[sequenceKey] = {};
    for (const step of steps) {
      out[sequenceKey][step.key] = [...step.templates];
    }
  }
  return out;
}

export function formatFollowUpStepDelay(minutes: number, stepKey?: string): string {
  if (stepKey === "appointment_reminder_morning" || minutes === SAME_DAY_MORNING_REMINDER_DELAY_MINUTES) {
    return "8h no dia da consulta";
  }
  if (minutes === 0) return "Imediato";
  if (minutes < 0) {
    const hours = Math.abs(minutes) / 60;
    if (hours >= 24) return `${Math.round(hours / 24)} dia(s) antes da consulta`;
    return `${hours}h antes da consulta`;
  }
  if (minutes < 60) return `${minutes} min depois`;
  if (minutes < 1440) return `${minutes / 60}h depois`;
  return `${Math.round(minutes / 1440)} dia(s) depois`;
}

export function followUpModeLabel(mode: FollowUpMode): string {
  return mode === "auto" ? "Automática" : "Tarefa manual";
}
