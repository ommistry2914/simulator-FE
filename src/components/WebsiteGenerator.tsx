import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Code2, Globe, Zap, Eye, Download, Copy, CheckCircle } from 'lucide-react';

const WebsiteGenerator = () => {
  const [formData, setFormData] = useState({
    projectName: '',
    projectDescription: '',
    industry: '',
    targetAudience: '',
    features: '',
    colorScheme: '',
    model: 'gpt-4'
  });
  
  const [streamingResponse, setStreamingResponse] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const iframeRef = useRef(null);
  const streamRef = useRef(null);

  const queryClient = useQueryClient();

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Stream processing function
  const processStream = async (response) => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              setIsStreaming(false);
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'token') {
                setStreamingResponse(prev => prev + parsed.content);
              } else if (parsed.type === 'code') {
                setGeneratedCode(parsed.content);
              } else if (parsed.type === 'error') {
                console.error('Stream error:', parsed.message);
                setIsStreaming(false);
              }
            } catch (e) {
              console.warn('Failed to parse stream data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream processing error:', error);
      setIsStreaming(false);
    }
  };

  // TanStack Query mutation for API call
  const generateWebsiteMutation = useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/generate-website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    },
    onSuccess: async (response) => {
      setIsStreaming(true);
      setStreamingResponse('');
      setGeneratedCode('');
      await processStream(response);
    },
    onError: (error) => {
      console.error('Generation failed:', error);
      setIsStreaming(false);
    }
  });

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.projectName || !formData.projectDescription) {
      alert('Please fill in required fields');
      return;
    }
    
    generateWebsiteMutation.mutate(formData);
  };

  // Update iframe when code changes
  useEffect(() => {
    if (generatedCode && iframeRef.current) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(generatedCode);
      doc.close();
    }
  }, [generatedCode]);

  // Copy code to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  // Download code as HTML file
  const downloadCode = () => {
    if (!generatedCode) return;
    
    const blob = new Blob([generatedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.projectName || 'website'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            AI Website Generator
          </h1>
          <p className="text-gray-600 text-lg">Create stunning websites with the power of AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                Project Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="projectName" className="text-sm font-medium">
                    Project Name *
                  </Label>
                  <Input
                    id="projectName"
                    placeholder="Enter your project name"
                    value={formData.projectName}
                    onChange={(e) => handleInputChange('projectName', e.target.value)}
                    className="mt-1"
                    disabled={isStreaming}
                  />
                </div>

                <div>
                  <Label htmlFor="projectDescription" className="text-sm font-medium">
                    Project Description *
                  </Label>
                  <Textarea
                    id="projectDescription"
                    placeholder="Describe your website vision..."
                    value={formData.projectDescription}
                    onChange={(e) => handleInputChange('projectDescription', e.target.value)}
                    className="mt-1 min-h-[100px]"
                    disabled={isStreaming}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="industry" className="text-sm font-medium">
                      Industry
                    </Label>
                    <Input
                      id="industry"
                      placeholder="e.g., Tech, Healthcare"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      className="mt-1"
                      disabled={isStreaming}
                    />
                  </div>

                  <div>
                    <Label htmlFor="targetAudience" className="text-sm font-medium">
                      Target Audience
                    </Label>
                    <Input
                      id="targetAudience"
                      placeholder="e.g., Young professionals"
                      value={formData.targetAudience}
                      onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                      className="mt-1"
                      disabled={isStreaming}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="features" className="text-sm font-medium">
                    Key Features
                  </Label>
                  <Textarea
                    id="features"
                    placeholder="List key features you want..."
                    value={formData.features}
                    onChange={(e) => handleInputChange('features', e.target.value)}
                    className="mt-1"
                    disabled={isStreaming}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="colorScheme" className="text-sm font-medium">
                      Color Scheme
                    </Label>
                    <Input
                      id="colorScheme"
                      placeholder="e.g., Blue and white"
                      value={formData.colorScheme}
                      onChange={(e) => handleInputChange('colorScheme', e.target.value)}
                      className="mt-1"
                      disabled={isStreaming}
                    />
                  </div>

                  <div>
                    <Label htmlFor="model" className="text-sm font-medium">
                      AI Model
                    </Label>
                    <Select 
                      value={formData.model} 
                      onValueChange={(value) => handleInputChange('model', value)}
                      disabled={isStreaming}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        <SelectItem value="claude-3">Claude 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  disabled={isStreaming || generateWebsiteMutation.isPending}
                >
                  {isStreaming || generateWebsiteMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      Generate Website
                    </>
                  )}
                </Button>
                </div>
            </CardContent>
          </Card>

          {/* Real-time Response Section */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                AI Response
                {isStreaming && <Badge variant="secondary" className="ml-2">Streaming...</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-gray-50">
                {streamingResponse ? (
                  <div className="whitespace-pre-wrap text-sm font-mono">
                    {streamingResponse}
                    {isStreaming && <span className="animate-pulse">▋</span>}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-20">
                    <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>AI response will appear here...</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Generated Website Display */}
        {generatedCode && (
          <Card className="mt-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-600" />
                  Generated Website
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="flex items-center gap-2"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Code
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadCode}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="preview" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="code" className="flex items-center gap-2">
                    <Code2 className="h-4 w-4" />
                    Code
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="preview" className="mt-4">
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      ref={iframeRef}
                      className="w-full h-[600px]"
                      title="Generated Website Preview"
                      sandbox="allow-scripts allow-same-origin allow-forms"
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="code" className="mt-4">
                  <ScrollArea className="h-[600px] w-full">
                    <pre className="text-sm bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <code>{generatedCode}</code>
                    </pre>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default WebsiteGenerator;