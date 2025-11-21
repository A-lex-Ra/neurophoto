# 💰 Tool Cost System

## Overview
The backend now supports a flexible cost system for tools where both the tool itself and its parameters can have associated credit costs.

## Architecture

### Tool Interface
Each tool must implement:
- `info.cost`: Base cost in credits for using the tool
- `calculateCost(params)`: Method to calculate total cost based on parameters
- `call(userId, params, generationService)`: Execute the tool

### Cost Calculation Flow
1. **Tool Selection**: User selects a tool and provides parameters
2. **Cost Calculation**: `ToolsService.calculateToolCost()` computes total cost
3. **Credit Deduction**: `GenerationService.create()` deducts credits via `BillingService`
4. **Execution**: Tool logic runs if credits are sufficient

## Example: Background Removal Tool

### Base Cost
- **1 credit** for basic background removal

### Parameter Costs
- `background_color`: **0 credits** (free color selection)
- `background_image`: **+0.5 credits** (if custom background image is provided)

### Total Cost Examples
- Remove background with white color: **1 credit**
- Remove background with custom image: **1.5 credits**

## Example: Upscale Tool

### Base Cost
- **2 credits** for upscaling

### Parameter Costs
- `upscale_factor: "2x"`: **0 additional credits**
- `upscale_factor: "4x"`: **+1 credit**

### Total Cost Examples
- Upscale 2x: **2 credits**
- Upscale 4x: **3 credits**

## Implementation Details

### Adding a New Tool with Costs

```typescript
class MyNewTool {
    public static info = {
        "name": "my_tool",
        "display_name": "My Tool",
        "description": "Does something cool",
        "cost": 2, // Base cost
        "parameters": {
            "type": "object",
            "properties": {
                "quality": {
                    "type": "string",
                    "enum": ["low", "high"],
                    "enumCosts": {
                        "low": 0,
                        "high": 1
                    }
                }
            }
        }
    };

    public static calculateCost(params: any): number {
        let totalCost = MyNewTool.info.cost;
        
        if (params.quality === 'high') {
            totalCost += 1;
        }
        
        return totalCost;
    }

    public static async call(userId: string, params: any, generationService: GenerationService) {
        const cost = MyNewTool.calculateCost(params);
        const dto: CreateGenerationDto = {
            prompt: `Do something with quality ${params.quality}`,
            cost,
        }
        return generationService.create(userId, dto);
    }
}
```

### Frontend Integration
The frontend receives tool information including costs via `GET /api/tools/list`. It can:
1. Display the base cost for each tool
2. Show parameter costs (if `enumCosts` is provided)
3. Calculate and display total cost before execution
4. Update user's credit balance after execution

## Benefits
- **Flexible Pricing**: Different tools and parameters can have different costs
- **Transparent**: Users know the cost before execution
- **Scalable**: Easy to add new tools with custom pricing
- **Audit Trail**: All credit transactions are logged via `BillingService`
