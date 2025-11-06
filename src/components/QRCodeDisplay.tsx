import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { QrCode, Share2, Copy, Check, ArrowLeft } from 'lucide-react';
import { SpotifyLogo } from './SpotifyLogo';

interface QRCodeDisplayProps {
  event: any;
  onBack: () => void;
}

export function QRCodeDisplay({ event, onBack }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  // Generate QR code URL (using qr-server.com as an example)
  const guestUrl = `${window.location.origin}/guest?code=${event.code}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(guestUrl)}`;
  
  const handleCopyUrl = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(guestUrl).catch(() => {
          // Fallback for failed clipboard
          const textArea = document.createElement('textarea');
          textArea.value = guestUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = guestUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join ${event.name}`,
        text: `Share your music preferences for ${event.name}!`,
        url: guestUrl,
      }).catch(() => {
        handleCopyUrl();
      });
    } else {
      handleCopyUrl();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Button onClick={onBack} className="mb-6 bg-black text-white hover:bg-gray-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="space-y-6">
          {/* Event Header */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <Badge variant="secondary" className="bg-white/20 text-white">
              Code: {event.code}
            </Badge>
            <p className="text-white/80">{event.theme}</p>
          </div>

          {/* QR Code */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="text-center">
              <CardTitle className="text-white flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5" />
                Guest QR Code
              </CardTitle>
              <CardDescription className="text-white/70">
                Guests scan this to share their music preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="bg-white p-4 rounded-lg mx-auto w-fit">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <div className="space-y-3">
                <p className="text-sm text-white/80">
                  Or share this link directly:
                </p>
                
                <div className="bg-white/10 p-3 rounded-lg">
                  <p className="text-xs text-white/90 break-all font-mono">
                    {guestUrl}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCopyUrl}
                    variant="outline" 
                    className="flex-1 border-white/30 text-white hover:bg-white/20"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleShare}
                    variant="outline" 
                    className="flex-1 border-white/30 text-white hover:bg-white/20"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-white">How guests use this:</h3>
              <div className="space-y-2 text-sm text-white/80">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <p>Scan QR code with phone camera</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="flex items-center gap-2 flex-wrap">
                    Connect <SpotifyLogo size={16} /> Spotify or Apple Music (or enter manually)
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <p>Share playlists & music preferences</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</div>
                  <p>AI creates perfect party playlist!</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}