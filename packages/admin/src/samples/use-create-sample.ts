import type { CreateSample } from "@projet-igsn/domain/sample/sample";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSampleRepository } from "#/samples/use-sample-repository.ts";

export function useCreateSample() {
  const repository = useSampleRepository();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSample) => repository.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["samples"] }),
  });
}
