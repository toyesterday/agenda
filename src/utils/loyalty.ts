import { supabase } from "@/integrations/supabase/client";

export const updateLoyalty = async (clientId: number, serviceName: string) => {
  // 1. Buscar pontos atuais
  const { data: client, error } = await supabase
    .from('clients')
    .select('loyalty_points')
    .eq('id', clientId)
    .single();

  if (error || !client) {
    return { newCount: 0, rewardGranted: false };
  }

  // 2. Atualizar contagem
  const currentPoints = client.loyalty_points || {};
  const serviceKey = serviceName.toLowerCase().replace(/\s+/g, '_');
  const currentCount = Number(currentPoints[serviceKey] || 0);
  let newCount = currentCount + 1;
  let rewardGranted = false;

  const updatedPoints = {
    ...currentPoints,
    [serviceKey]: newCount
  };

  // 3. Verificar se ganhou recompensa
  if (newCount >= 10) {
    updatedPoints[serviceKey] = 0; // Resetar contador
    newCount = 0; // Atualiza a contagem para o retorno
    rewardGranted = true;
  }

  // 4. Salvar no banco
  await supabase
    .from('clients')
    .update({ loyalty_points: updatedPoints })
    .eq('id', clientId);
    
  return { newCount, rewardGranted };
};

export const deductLoyalty = async (clientId: number, serviceName: string) => {
  // 1. Buscar pontos atuais
  const { data: client, error } = await supabase
    .from('clients')
    .select('loyalty_points')
    .eq('id', clientId)
    .single();

  if (error || !client) {
    console.error("Loyalty deduction failed: client not found.", error);
    return;
  }

  // 2. Atualizar contagem
  const currentPoints = client.loyalty_points || {};
  const serviceKey = serviceName.toLowerCase().replace(/\s+/g, '_');
  const currentCount = Number(currentPoints[serviceKey] || 0);

  // Apenas deduzir se os pontos forem > 0
  if (currentCount > 0) {
    const newCount = currentCount - 1;
    const updatedPoints = {
      ...currentPoints,
      [serviceKey]: newCount
    };

    // 3. Salvar no banco
    const { error: updateError } = await supabase
      .from('clients')
      .update({ loyalty_points: updatedPoints })
      .eq('id', clientId);
    
    if (updateError) {
      console.error("Failed to deduct loyalty point.", updateError);
    }
  }
};