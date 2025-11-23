import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { GenerationService } from '../generation/generation.service';
import { CreateGenerationDto } from '../generation/dto/create-generation.dto';

interface ToolParameterCost {
    value: any;
    cost: number;
}

interface Tool {
    info: {
        name: string;
        display_name?: string;
        description?: string;
        cost: number; // Base cost in credits
        parameters?: any;
    };
    call: (userId: string, params: any, generationService: GenerationService) => Promise<any>;
    calculateCost: (params: any) => number; // Calculate total cost based on parameters
}

class BackgroundRemovalTool {
    public static info = {
        "name": "background_removal",
        "display_name": "Замена фона",
        "description": "Заменяет фон на выбранный цвет или изображение",
        "cost": 1, // Base cost: 1 credit
        "parameters": {
            "type": "object",
            "properties": {
                "image": {
                    "type": "string",
                    "description": "Input image (fileID)",
                    "required": true
                },
                "background_color": {
                    "type": "string",
                    "description": "Выберите цвет фона",
                    "default": "#FFFFFF (белый)",
                    "enum": ["#FFFFFF (белый)", "#000000 (чёрный)", "transparent (прозрачный)"],
                    "cost": 0 // No additional cost for color selection
                },
                "background_image": {
                    "type": "image",
                    "description": "Replacement background image (fileID)",
                    "default": null,
                    "cost": 0.5 // Additional 0.5 credits if custom background is used
                },
            },
            "required": ["image"]
        }
    };

    public static calculateCost(params: any): number {
        let totalCost = BackgroundRemovalTool.info.cost; // Start with base cost

        // Add cost if background_image is provided
        if (params.background_image && params.background_image !== null) {
            totalCost += 0.5;
        }

        return totalCost;
    }

    public static async call(userId: string, params: any, generationService: GenerationService) {
        const cost = BackgroundRemovalTool.calculateCost(params);
        const dto: CreateGenerationDto = {
            prompt: `Remove the background from the image.${params.background_color ? ` Replace it with a *${params.background_color}* background.` : ''}`,
            inputFileId: params.image,
            cost, // Pass the calculated cost
        }
        return generationService.create(userId, dto);
    }
}

class UpscaleTool {
    public static info = {
        "name": "upscale",
        "display_name": "Upscale",
        "description": "Upscaling images using AI",
        "cost": 2, // Base cost: 2 credits
        "parameters": {
            "type": "object",
            "properties": {
                "image": {
                    "type": "string",
                    "description": "Input image (fileID)",
                    "required": true
                },
                "upscale_factor": {
                    "type": "string",
                    "description": "Upscale factor",
                    "default": "2x",
                    "enum": ["2x", "4x"],
                    "enumCosts": {
                        "2x": 0,    // No additional cost for 2x
                        "4x": 1     // Additional 1 credit for 4x
                    }
                },
                "required": ["upscale"]
            }
        }
    };

    public static calculateCost(params: any): number {
        let totalCost = UpscaleTool.info.cost; // Start with base cost

        // Add cost based on upscale factor
        if (params.upscale_factor === '4x') {
            totalCost += 1;
        }

        return totalCost;
    }

    public static async call(userId: string, params: any, generationService: GenerationService) {
        const cost = UpscaleTool.calculateCost(params);
        // TODO: implement upscale logic, using dto.model to select model
        const dto: CreateGenerationDto = {
            prompt: `Upscale the image by a factor of ${params.upscale_factor}.`,
            inputFileId: params.image,
            model: params.upscale_factor === '4x' ? 'upscale-4x-model' : 'upscale-2x-model',
            cost, // Pass the calculated cost
        }
        return generationService.create(userId, dto);
    }
}

@Injectable()
export class ToolsService {
    private readonly logger = new Logger(ToolsService.name);
    private toolsToImplementationMap: { [key: string]: Tool } = {
        'background_removal': BackgroundRemovalTool,
        //   'upscale': UpscaleTool,
    };
    constructor(
        private readonly generationService: GenerationService,
    ) { }

    /**
     * Calculate the total cost for a tool call based on tool and parameters
     */
    calculateToolCost(toolName: string, params: any): number {
        if (!(toolName in this.toolsToImplementationMap)) {
            throw new NotFoundException(`Tool ${toolName} not found`);
        }

        const tool = this.toolsToImplementationMap[toolName];
        return tool.calculateCost(params);
    }

    async toolCall(userId: string, toolName: string, toolCallParams: any) {
        this.logger.debug(`Tool call for tool: ${toolName} with params: ${JSON.stringify(toolCallParams)}`);

        if (!(toolName in this.toolsToImplementationMap)) {
            this.logger.error(`Tool ${toolName} not found`);
            throw new NotFoundException(`Tool ${toolName} not found`);
        }

        // Calculate total cost for this tool call
        const totalCost = this.calculateToolCost(toolName, toolCallParams);
        this.logger.log(`Tool ${toolName} will cost ${totalCost} credits`);

        // Note: Credit deduction is handled by GenerationService.create()
        // which is called by the tool's call() method
        // The tool cost is passed through the generation system

        return this.toolsToImplementationMap[toolName].call(userId, toolCallParams, this.generationService);
    }

    async listTools() {
        return Object.values(this.toolsToImplementationMap).map(tool => tool.info);
    }

}
