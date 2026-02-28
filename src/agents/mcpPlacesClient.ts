/**
 * MCP client for the places-intelligence server.
 * Same singleton pattern as mcpClient.ts (market-truth).
 * Used by on-demand agents that need live venue data outside the cached window.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

const MCP_SERVER_PATH = path.resolve(
    process.cwd(),
    'mcp-servers/places-intelligence/build/index.js'
);

const g = global as typeof globalThis & {
    _mcpPlacesClient?: Client;
    _mcpPlacesTransport?: StdioClientTransport;
};

async function getOrCreatePlacesClient(): Promise<Client> {
    if (g._mcpPlacesClient) return g._mcpPlacesClient;

    const transport = new StdioClientTransport({ command: 'node', args: [MCP_SERVER_PATH] });
    const client = new Client(
        { name: 'hephae-hub-places-client', version: '1.0.0' },
        { capabilities: {} }
    );
    await client.connect(transport);

    g._mcpPlacesClient = client;
    g._mcpPlacesTransport = transport;
    return client;
}

export async function callPlacesTool(toolName: string, args: Record<string, any> = {}): Promise<any> {
    const client = await getOrCreatePlacesClient();
    try {
        const result = await client.callTool({ name: toolName, arguments: args });
        const content = result.content as Array<any>;
        if (Array.isArray(content) && content.length > 0 && content[0].type === 'text') {
            try {
                return JSON.parse(content[0].text);
            } catch {
                return content[0].text;
            }
        }
        return content;
    } catch (e) {
        g._mcpPlacesClient = undefined;
        g._mcpPlacesTransport = undefined;
        throw e;
    }
}
