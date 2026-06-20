import { useState } from 'react'
import { FileText, Sparkles, Download, Eye, EyeOff, X, ExternalLink, Minimize2 } from 'lucide-react'
import { Card, Button } from '../../ui'

interface CharacterDesign {
  name: string
  role: string
  description?: string
  image?: string
}

interface ProposalDetailViewProps {
  script?: string
  scriptFile?: string
  characterDesigns?: CharacterDesign[]
}

export function ProposalDetailView({
  script,
  scriptFile,
  characterDesigns = [],
}: ProposalDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'script' | 'characters'>('script')
  const [showPdf, setShowPdf] = useState(false)
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterDesign | null>(null)

  return (
    <div className="space-y-4 w-full">
      {/* Navigation tabs for proposal overview */}
      <div className="flex border-b border-neutral-100 pb-2">
        <button
          onClick={() => setActiveTab('script')}
          className={`flex items-center gap-1.5 pb-2 px-3 text-xs font-bold transition-all relative ${
            activeTab === 'script'
              ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-[10px]'
              : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <FileText className="size-4" />
          Script & Outline
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          className={`flex items-center gap-1.5 pb-2 px-3 text-xs font-bold transition-all relative ${
            activeTab === 'characters'
              ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-[10px]'
              : 'text-neutral-400 hover:text-neutral-600'
          }`}
        >
          <Sparkles className="size-4" />
          Character Designs ({characterDesigns.length})
        </button>
      </div>

      {/* Tab 1: Script & Outline Panel */}
      {activeTab === 'script' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {script ? (
            <div className="text-xs text-neutral-700 leading-relaxed bg-amber-50/30 p-4 rounded-2xl border border-amber-100/50 shadow-xs max-h-80 overflow-y-auto whitespace-pre-wrap font-medium font-mono">
              {script}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">No text outline draft was submitted for this series.</p>
          )}

          {scriptFile && (
            <Card className="p-4 border border-indigo-100 bg-indigo-50/20 rounded-2xl flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-100/60 border border-indigo-100 shrink-0">
                    <FileText className="size-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-indigo-950 truncate">Attached Script Document (PDF)</h5>
                    <p className="text-[10px] text-indigo-500 font-medium">Click preview to view in-app or download locally.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPdf(!showPdf)}
                    className="h-8 rounded-xl text-[10px] font-bold border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 flex items-center gap-1 shadow-xs"
                  >
                    {showPdf ? (
                      <>
                        <EyeOff className="size-3.5" />
                        Close PDF
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5" />
                        View PDF
                      </>
                    )}
                  </Button>
                  <a
                    href={scriptFile}
                    target="_blank"
                    rel="noreferrer"
                    className="h-8 inline-flex items-center gap-1 px-3 text-[10px] font-extrabold uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs"
                  >
                    <Download className="size-3.5" />
                    Open PDF
                  </a>
                </div>
              </div>

              {/* Collapsible IFrame PDF Reader */}
              {showPdf && (
                <div className="border border-indigo-100 rounded-xl overflow-hidden bg-white shadow-inner relative animate-in slide-in-from-top-2 duration-300">
                  <div className="bg-indigo-50/50 border-b border-indigo-100 px-3 py-1.5 flex items-center justify-between text-[10px] font-bold text-indigo-950">
                    <span>Embedded Document Viewer</span>
                    <button
                      onClick={() => setShowPdf(false)}
                      className="p-1 hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 rounded-md transition-colors"
                    >
                      <Minimize2 className="size-3.5" />
                    </button>
                  </div>
                  <iframe
                    src={`${scriptFile}#toolbar=0`}
                    className="w-full h-[550px] bg-neutral-100 border-none"
                    title="Series script file preview"
                  />
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Character Designs Panel */}
      {activeTab === 'characters' && (
        <div className="animate-in fade-in duration-200">
          {characterDesigns.length === 0 ? (
            <div className="p-8 border border-dashed border-neutral-200 rounded-3xl flex flex-col items-center justify-center text-center space-y-2 bg-neutral-50/40">
              <Sparkles className="size-8 text-neutral-300" />
              <p className="text-xs text-neutral-400 italic">No character design concepts uploaded for this proposal.</p>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {characterDesigns.map((char, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedCharacter(char)}
                  className="flex gap-3 p-3 bg-white border border-neutral-100 rounded-2xl hover:border-indigo-200 hover:shadow-md cursor-pointer transition-all duration-200 group relative overflow-hidden"
                >
                  {/* Hover indicator overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500/0 group-hover:bg-indigo-500/80 transition-all duration-300" />

                  {char.image ? (
                    <img
                      src={char.image}
                      alt={char.name}
                      className="size-14 rounded-xl object-cover border border-neutral-100 shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="size-14 rounded-xl bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center text-[9px] text-neutral-400 shrink-0 font-bold">
                      No Sketch
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-neutral-900 text-xs truncate max-w-[120px] group-hover:text-indigo-600 transition-colors">
                        {char.name}
                      </span>
                      <span className="text-[8px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/50 px-1.5 py-0.5 rounded-md truncate max-w-[90px]">
                        {char.role}
                      </span>
                    </div>
                    {char.description ? (
                      <p className="text-[10px] text-neutral-500 leading-normal line-clamp-2 pr-2">
                        {char.description}
                      </p>
                    ) : (
                      <p className="text-[10px] text-neutral-300 italic">No description provided.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox / Custom Biography Overlay Modal */}
      {selectedCharacter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/65 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedCharacter(null)}
        >
          <div
            className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-100 max-w-xl w-full flex flex-col md:flex-row relative animate-in zoom-in-95 duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedCharacter(null)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/90 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 border border-neutral-100 shadow-sm transition-colors"
            >
              <X className="size-4.5" />
            </button>

            {/* Left Box: Sketch image display */}
            <div className="w-full md:w-1/2 h-56 md:h-80 bg-neutral-50 border-r border-neutral-100 shrink-0 relative group">
              {selectedCharacter.image ? (
                <>
                  <img
                    src={selectedCharacter.image}
                    alt={selectedCharacter.name}
                    className="w-full h-full object-cover"
                  />
                  <a
                    href={selectedCharacter.image}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-3 right-3 p-1.5 bg-white/95 border border-neutral-100 text-neutral-500 hover:text-indigo-600 rounded-lg shadow-sm transition-all opacity-0 group-hover:opacity-100 text-[10px] font-bold flex items-center gap-1"
                  >
                    <ExternalLink className="size-3.5" /> Full Size
                  </a>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-neutral-400 bg-neutral-50 border border-dashed border-neutral-200 p-4">
                  <Sparkles className="size-8 text-neutral-300" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">No Sketch Provided</span>
                </div>
              )}
            </div>

            {/* Right Box: Info descriptions */}
            <div className="p-6 flex-1 flex flex-col min-w-0 space-y-3.5 max-h-[320px] md:max-h-[320px] overflow-y-auto">
              <div className="space-y-1.5 mt-2 md:mt-0">
                <span className="text-[8px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-full inline-block">
                  {selectedCharacter.role}
                </span>
                <h4 className="text-lg font-black text-neutral-900 leading-tight truncate">
                  {selectedCharacter.name}
                </h4>
              </div>

              <div className="border-t border-neutral-100 pt-3">
                <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-widest block mb-1">
                  Biography & Backstory
                </span>
                <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-wrap font-medium">
                  {selectedCharacter.description || 'No detailed character bio or backstory notes provided.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
