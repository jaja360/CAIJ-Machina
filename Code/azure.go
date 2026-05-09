package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/azure"
	"github.com/openai/openai-go/v3/responses"
)

func newOpenAIClient() openai.Client {
	return openai.NewClient(
		azure.WithEndpoint(azureOpenAIEndpoint(os.Getenv("AZURE_RESOURCE_NAME")), os.Getenv("AZURE_API_VERSION")),
		azure.WithAPIKey(os.Getenv("AZURE_API_KEY")),
	)
}

func (cfg *apiConfig) getAzureResponse(resp string) (string, error) {
	response, err := cfg.openaiClient.Responses.New(context.Background(), responses.ResponseNewParams{
		Input: responses.ResponseNewParamsInputUnion{OfString: openai.String(resp)},
		Model: openai.ChatModelGPT5_4Nano,
	})
	if err != nil {
		return "", err
	}
	return response.OutputText(), nil
}

func azureOpenAIEndpoint(resourceName string) string {
	resourceName = strings.TrimSpace(resourceName)
	if resourceName == "" {
		return ""
	}
	if strings.HasPrefix(resourceName, "http://") || strings.HasPrefix(resourceName, "https://") {
		return strings.TrimRight(resourceName, "/")
	}
	return fmt.Sprintf("https://%s.openai.azure.com", resourceName)
}
