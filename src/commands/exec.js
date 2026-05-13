import { ExecutePlanUseCase } from "#application/use-cases/execute-plan.uc";

export async function exec(fileDestination, flags = []) {
  const useCase = new ExecutePlanUseCase();
  await useCase.execute({ fileDestination, flags });
}
