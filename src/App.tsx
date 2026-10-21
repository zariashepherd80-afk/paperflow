import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  FileStack,
  FileText,
  ImagePlus,
  Info,
  LoaderCircle,
  Menu,
  Plus,
  RotateCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { EnhancementPreset, ScanDocument, ScanPage } from './types';
import {
  createDocument,
  createPage,
  formatDocumentDate,
  formatDocumentTime,
  getPresetFilter,
  PRESET_DESCRIPTIONS,
  PRESET_LABELS,
  rotateQuarterTurn,
  slugify,
} from './lib/scan';
import { loadDocuments, saveDocuments } from './lib/storage';
import { normalizeImageFile, renderPageToDataUrl } from './lib/image';

type AppView = 'dashboard' | 'editor';

const PRESETS: EnhancementPreset[] = ['original', 'magic', 'mono'];

function imageStyle(page: ScanPage) {
  return {
    filter: getPresetFilter(page.preset),
    transform: `rotate(${page.rotation}deg)`,
  };
}

function App() {
  const [documents, setDocuments] = useState<ScanDocument[]>(loadDocuments);
  const [view, setView] = useState<AppView>('dashboard');
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveDocuments(documents);
  }, [documents]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setImportError(null);
        setIsImportOpen(true);
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (!isImportOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isImporting) {
        setIsImportOpen(false);
        setImportError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImportOpen, isImporting]);

  const activeDocument = useMemo(
    () => documents.find((document) => document.id === activeDocumentId) ?? null,
    [activeDocumentId, documents],
  );

  const selectedPage = useMemo(
    () => activeDocument?.pages.find((page) => page.id === selectedPageId) ?? activeDocument?.pages[0] ?? null,
    [activeDocument, selectedPageId],
  );

  const selectedPageIndex = selectedPage
    ? (activeDocument?.pages.findIndex((page) => page.id === selectedPage.id) ?? 0) + 1
    : 0;

  const totalPages = documents.reduce((total, document) => total + document.pages.length, 0);

  function openImportDialog() {
    setImportError(null);
    setIsImportOpen(true);
    setIsSidebarOpen(false);
  }

  function closeImportDialog() {
    if (!isImporting) {
      setIsImportOpen(false);
      setImportError(null);
    }
  }

  function openDocument(documentId: string) {
    const document = documents.find((item) => item.id === documentId);
    if (!document) {
      return;
    }

    setActiveDocumentId(document.id);
    setSelectedPageId(document.pages[0]?.id ?? null);
    setView('editor');
    setIsSidebarOpen(false);
  }

  function returnToDashboard() {
    setView('dashboard');
    setActiveDocumentId(null);
    setSelectedPageId(null);
    setIsSidebarOpen(false);
  }

  function updateActiveDocument(update: (document: ScanDocument) => ScanDocument) {
    if (!activeDocumentId) {
      return;
    }

    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === activeDocumentId
          ? { ...update(document), updatedAt: Date.now() }
          : document,
      ),
    );
  }

  async function importFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) => file.type.startsWith('image/'));

    if (!files.length) {
      setImportError('Choose one or more image files to start your scan.');
      return;
    }

    setImportError(null);
    setIsImporting(true);

    try {
      const sources = await Promise.all(files.map((file) => normalizeImageFile(file)));
      const pages = sources.map((source) => createPage(source));

      if (activeDocument && view === 'editor') {
        updateActiveDocument((document) => ({
          ...document,
          pages: [...document.pages, ...pages],
        }));
        setSelectedPageId(pages[0].id);
        setToast(`${pages.length} ${pages.length === 1 ? 'page' : 'pages'} added to this document.`);
      } else {
        const document = createDocument(pages, `Scan · ${formatDocumentDate(Date.now())}`);
        setDocuments((currentDocuments) => [document, ...currentDocuments]);
        setActiveDocumentId(document.id);
        setSelectedPageId(pages[0].id);
        setView('editor');
        setToast(`${pages.length} ${pages.length === 1 ? 'page' : 'pages'} ready to review.`);
      }

      setIsImportOpen(false);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Paperflow could not import these images.');
    } finally {
      setIsImporting(false);
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (files?.length) {
      void importFiles(files);
    }
    event.target.value = '';
  }

  function selectPreset(preset: EnhancementPreset) {
    if (!selectedPage) {
      return;
    }

    updateActiveDocument((document) => ({
      ...document,
      pages: document.pages.map((page) =>
        page.id === selectedPage.id ? { ...page, preset } : page,
      ),
    }));
  }

  function rotateSelectedPage() {
    if (!selectedPage) {
      return;
    }

    updateActiveDocument((document) => ({
      ...document,
      pages: document.pages.map((page) =>
        page.id === selectedPage.id
          ? { ...page, rotation: rotateQuarterTurn(page.rotation) }
          : page,
      ),
    }));
  }

  function deleteSelectedPage() {
    if (!selectedPage || !activeDocument) {
      return;
    }

    const remainingPages = activeDocument.pages.filter((page) => page.id !== selectedPage.id);
    if (!remainingPages.length) {
      setDocuments((currentDocuments) =>
        currentDocuments.filter((document) => document.id !== activeDocument.id),
      );
      returnToDashboard();
      setToast('Empty document removed.');
      return;
    }

    updateActiveDocument((document) => ({
      ...document,
      pages: remainingPages,
    }));
    setSelectedPageId(remainingPages[Math.max(0, selectedPageIndex - 2)]?.id ?? remainingPages[0].id);
    setToast('Page deleted.');
  }

  async function exportDocument() {
    if (!activeDocument || !activeDocument.pages.length) {
      return;
    }

    setIsExporting(true);

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 30;

      for (const [index, page] of activeDocument.pages.entries()) {
        const renderedSource = await renderPageToDataUrl(page);
        const dimensions = await getDataUrlDimensions(renderedSource);
        const scale = Math.min(
          (pageWidth - margin * 2) / dimensions.width,
          (pageHeight - margin * 2) / dimensions.height,
        );
        const renderedWidth = dimensions.width * scale;
        const renderedHeight = dimensions.height * scale;

        if (index > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          renderedSource,
          'JPEG',
          (pageWidth - renderedWidth) / 2,
          (pageHeight - renderedHeight) / 2,
          renderedWidth,
          renderedHeight,
          undefined,
          'FAST',
        );
      }

      pdf.save(`${slugify(activeDocument.title)}.pdf`);
      setToast('PDF downloaded to your device.');
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Paperflow could not create the PDF.');
    } finally {
      setIsExporting(false);
    }
  }

  function renameDocument(title: string) {
    updateActiveDocument((document) => ({
      ...document,
      title,
    }));
  }

  return (
    <div className="app-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        currentView={view}
        documentCount={documents.length}
        onClose={() => setIsSidebarOpen(false)}
        onDashboard={returnToDashboard}
        onNewScan={openImportDialog}
        onHelp={() => setToast('Capture pages, choose a preset, then download a PDF — everything stays local.')}
      />

      <main className="app-main">
        <button
          className="mobile-menu-button icon-button"
          type="button"
          aria-label="Open navigation"
          onClick={() => setIsSidebarOpen(true)}
        >
          <Menu size={20} strokeWidth={2.2} />
        </button>

        {view === 'dashboard' ? (
          <Dashboard
            documents={documents}
            totalPages={totalPages}
            onNewScan={openImportDialog}
            onOpenDocument={openDocument}
          />
        ) : activeDocument ? (
          <Editor
            document={activeDocument}
            selectedPage={selectedPage}
            selectedPageIndex={selectedPageIndex}
            isExporting={isExporting}
            onBack={returnToDashboard}
            onAddPages={openImportDialog}
            onRename={renameDocument}
            onSelectPage={setSelectedPageId}
            onSelectPreset={selectPreset}
            onRotate={rotateSelectedPage}
            onDelete={deleteSelectedPage}
            onExport={exportDocument}
          />
        ) : (
          <div className="missing-state">
            <p>That document is no longer available.</p>
            <button className="button button-primary" type="button" onClick={returnToDashboard}>
              Back to scans
            </button>
          </div>
        )}
      </main>

      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileInputChange}
      />
      <input
        ref={cameraInputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
      />

      <ImportModal
        isOpen={isImportOpen}
        isImporting={isImporting}
        isAddingPages={view === 'editor' && Boolean(activeDocument)}
        error={importError}
        onClose={closeImportDialog}
        onBrowse={() => fileInputRef.current?.click()}
        onCamera={() => cameraInputRef.current?.click()}
        onDrop={importFiles}
      />

      {toast ? (
        <div className="toast" role="status">
          <Check size={16} strokeWidth={2.6} />
          <span>{toast}</span>
        </div>
      ) : null}
    </div>
  );
}

interface SidebarProps {
  isOpen: boolean;
  currentView: AppView;
  documentCount: number;
  onClose: () => void;
  onDashboard: () => void;
  onNewScan: () => void;
  onHelp: () => void;
}

function Sidebar({
  isOpen,
  currentView,
  documentCount,
  onClose,
  onDashboard,
  onNewScan,
  onHelp,
}: SidebarProps) {
  return (
    <>
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-topline">
          <a className="brand" href="#top" onClick={(event) => event.preventDefault()}>
            <span className="brand-mark" aria-hidden="true">
              <ScanLine size={19} strokeWidth={2.5} />
            </span>
            <span>Paperflow</span>
          </a>
          <button className="icon-button sidebar-close" type="button" aria-label="Close navigation" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <button className="new-scan-button" type="button" onClick={onNewScan}>
          <span className="new-scan-icon">
            <Plus size={17} strokeWidth={2.7} />
          </span>
          <span>New scan</span>
          <span className="shortcut-hint">⌘ K</span>
        </button>

        <div className="sidebar-section">
          <p className="sidebar-label">Workspace</p>
          <button
            className={`sidebar-link ${currentView === 'dashboard' ? 'sidebar-link-active' : ''}`}
            type="button"
            onClick={onDashboard}
          >
            <FileStack size={18} />
            <span>All scans</span>
            <span className="sidebar-count">{documentCount}</span>
          </button>
        </div>

        <div className="sidebar-spacer" />

        <div className="privacy-card">
          <div className="privacy-icon">
            <ShieldCheck size={17} />
          </div>
          <div>
            <strong>Private by default</strong>
            <p>Your scans stay on this device.</p>
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-footer-link" type="button" onClick={onHelp}>
            <CircleHelp size={16} />
            <span>How Paperflow works</span>
          </button>
          <span className="version-label">v0.1 MVP</span>
        </div>
      </aside>
      {isOpen ? <button className="sidebar-scrim" type="button" aria-label="Close navigation" onClick={onClose} /> : null}
    </>
  );
}

interface DashboardProps {
  documents: ScanDocument[];
  totalPages: number;
  onNewScan: () => void;
  onOpenDocument: (documentId: string) => void;
}

function Dashboard({ documents, totalPages, onNewScan, onOpenDocument }: DashboardProps) {
  const recentDocuments = documents.slice(0, 6);

  return (
    <div className="page dashboard-page" id="top">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Your private workspace</p>
          <h1>Good to see you.</h1>
          <p className="header-subtitle">Turn paper into clear, shareable documents in a few taps.</p>
        </div>
        <button className="button button-primary header-action" type="button" onClick={onNewScan}>
          <Plus size={18} strokeWidth={2.5} />
          <span>New scan</span>
        </button>
      </header>

      <section className="stats-grid" aria-label="Scan summary">
        <div className="stat-card stat-card-primary">
          <div className="stat-card-icon">
            <FileStack size={18} />
          </div>
          <div>
            <span className="stat-label">Documents</span>
            <strong>{documents.length}</strong>
          </div>
          <span className="stat-decoration stat-decoration-one" />
        </div>
        <div className="stat-card">
          <div className="stat-card-icon stat-card-icon-soft">
            <FileText size={18} />
          </div>
          <div>
            <span className="stat-label">Pages scanned</span>
            <strong>{totalPages}</strong>
          </div>
        </div>
        <div className="stat-card stat-card-note">
          <div className="stat-card-icon stat-card-icon-mint">
            <ShieldCheck size={18} />
          </div>
          <div>
            <span className="stat-label">Storage</span>
            <strong>On device</strong>
          </div>
        </div>
      </section>

      <section className="recent-section">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Your library</p>
            <h2>Recent scans</h2>
          </div>
          {documents.length ? <span className="section-meta">{documents.length} total</span> : null}
        </div>

        {recentDocuments.length ? (
          <div className="document-grid">
            {recentDocuments.map((document) => (
              <DocumentCard key={document.id} document={document} onOpen={() => onOpenDocument(document.id)} />
            ))}
          </div>
        ) : (
          <EmptyDashboard onNewScan={onNewScan} />
        )}
      </section>
    </div>
  );
}

function DocumentCard({ document, onOpen }: { document: ScanDocument; onOpen: () => void }) {
  const coverPages = document.pages.slice(0, 3);

  return (
    <button className="document-card" type="button" onClick={onOpen}>
      <div className="document-card-cover">
        <div className="document-card-paper document-card-paper-back" />
        {coverPages.map((page, index) => (
          <div
            className={`document-card-paper document-card-paper-${index + 1}`}
            key={page.id}
          >
            <img src={page.source} alt="" style={imageStyle(page)} />
          </div>
        ))}
        <span className="page-count-badge">
          <FileText size={13} />
          {document.pages.length} {document.pages.length === 1 ? 'page' : 'pages'}
        </span>
      </div>
      <div className="document-card-info">
        <div>
          <h3>{document.title || 'Untitled scan'}</h3>
          <p>
            {formatDocumentDate(document.updatedAt)} <span>·</span> {formatDocumentTime(document.updatedAt)}
          </p>
        </div>
        <span className="card-arrow" aria-hidden="true">
          <ChevronRight size={18} />
        </span>
      </div>
    </button>
  );
}

function EmptyDashboard({ onNewScan }: { onNewScan: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-state-art" aria-hidden="true">
        <div className="empty-state-glow" />
        <div className="empty-state-icon">
          <ScanLine size={31} strokeWidth={1.8} />
        </div>
      </div>
      <p className="eyebrow">Start with a clean slate</p>
      <h3>No scans yet</h3>
      <p className="empty-state-copy">Capture a page with your camera or bring in images from your device.</p>
      <button className="button button-secondary" type="button" onClick={onNewScan}>
        <Plus size={17} />
        Create your first scan
      </button>
    </div>
  );
}

interface EditorProps {
  document: ScanDocument;
  selectedPage: ScanPage | null;
  selectedPageIndex: number;
  isExporting: boolean;
  onBack: () => void;
  onAddPages: () => void;
  onRename: (title: string) => void;
  onSelectPage: (pageId: string) => void;
  onSelectPreset: (preset: EnhancementPreset) => void;
  onRotate: () => void;
  onDelete: () => void;
  onExport: () => void;
}

function Editor({
  document,
  selectedPage,
  selectedPageIndex,
  isExporting,
  onBack,
  onAddPages,
  onRename,
  onSelectPage,
  onSelectPreset,
  onRotate,
  onDelete,
  onExport,
}: EditorProps) {
  return (
    <div className="page editor-page">
      <header className="editor-header">
        <div className="editor-heading">
          <button className="icon-button back-button" type="button" aria-label="Back to scans" onClick={onBack}>
            <ArrowLeft size={20} />
          </button>
          <div className="editor-title-wrap">
            <p className="eyebrow">Document workspace</p>
            <input
              className="document-title-input"
              aria-label="Document title"
              value={document.title}
              onChange={(event) => onRename(event.target.value)}
              placeholder="Untitled scan"
            />
            <span className="document-save-note">
              <span className="save-dot" /> Saved on this device
            </span>
          </div>
        </div>
        <div className="editor-header-actions">
          <button className="button button-secondary" type="button" onClick={onAddPages}>
            <ImagePlus size={17} />
            <span>Add pages</span>
          </button>
          <button className="button button-primary" type="button" onClick={onExport} disabled={isExporting}>
            {isExporting ? <LoaderCircle className="spin" size={17} /> : <Download size={17} />}
            <span>{isExporting ? 'Preparing PDF…' : 'Download PDF'}</span>
          </button>
        </div>
      </header>

      <div className="editor-layout">
        <aside className="page-rail">
          <div className="rail-header">
            <div>
              <p className="eyebrow">Document</p>
              <h2>Pages</h2>
            </div>
            <span className="rail-count">{document.pages.length}</span>
          </div>
          <div className="thumbnail-list">
            {document.pages.map((page, index) => (
              <button
                className={`thumbnail-button ${selectedPage?.id === page.id ? 'thumbnail-button-active' : ''}`}
                type="button"
                key={page.id}
                onClick={() => onSelectPage(page.id)}
              >
                <span className="thumbnail-frame">
                  <img src={page.source} alt={`Page ${index + 1}`} style={imageStyle(page)} />
                </span>
                <span className="thumbnail-label">Page {index + 1}</span>
                {selectedPage?.id === page.id ? <Check className="thumbnail-check" size={14} /> : null}
              </button>
            ))}
          </div>
          <button className="add-page-tile" type="button" onClick={onAddPages}>
            <span className="add-page-tile-icon">
              <Plus size={17} />
            </span>
            <span>Add page</span>
          </button>
          <div className="rail-tip">
            <Info size={15} />
            <span>Tip: use Magic for everyday receipts and notes.</span>
          </div>
        </aside>

        <section className="editor-workspace">
          {selectedPage ? (
            <>
              <div className="workspace-toolbar">
                <div className="workspace-page-label">
                  <span className="workspace-page-number">{String(selectedPageIndex).padStart(2, '0')}</span>
                  <div>
                    <strong>Page {selectedPageIndex}</strong>
                    <span>Adjust your capture</span>
                  </div>
                </div>
                <div className="workspace-actions">
                  <button className="tool-button" type="button" onClick={onRotate}>
                    <RotateCw size={17} />
                    <span>Rotate</span>
                  </button>
                  <button className="tool-button tool-button-danger" type="button" onClick={onDelete}>
                    <Trash2 size={17} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>

              <div className="preview-stage">
                <div className="preview-stage-grid" aria-hidden="true" />
                <div className="preview-paper">
                  <img src={selectedPage.source} alt={`Preview of page ${selectedPageIndex}`} style={imageStyle(selectedPage)} />
                </div>
                <div className="preview-caption">
                  <span>Preview</span>
                  <span className="preview-caption-divider" />
                  <span>{PRESET_LABELS[selectedPage.preset]} preset</span>
                </div>
              </div>

              <div className="enhancement-section">
                <div className="enhancement-heading">
                  <div>
                    <p className="eyebrow">Make it yours</p>
                    <h2>Enhancement</h2>
                  </div>
                  <Sparkles size={19} />
                </div>
                <div className="preset-grid">
                  {PRESETS.map((preset) => (
                    <button
                      className={`preset-card ${selectedPage.preset === preset ? 'preset-card-active' : ''}`}
                      type="button"
                      key={preset}
                      onClick={() => onSelectPreset(preset)}
                    >
                      <span className={`preset-preview preset-preview-${preset}`}>
                        <img src={selectedPage.source} alt="" style={{ ...imageStyle({ ...selectedPage, preset, rotation: 0 }) }} />
                        {selectedPage.preset === preset ? (
                          <span className="preset-selected-mark">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        ) : null}
                      </span>
                      <span className="preset-card-copy">
                        <strong>{PRESET_LABELS[preset]}</strong>
                        <small>{PRESET_DESCRIPTIONS[preset]}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="missing-state">
              <p>Add a page to start editing.</p>
              <button className="button button-primary" type="button" onClick={onAddPages}>
                <Plus size={17} /> Add page
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

interface ImportModalProps {
  isOpen: boolean;
  isImporting: boolean;
  isAddingPages: boolean;
  error: string | null;
  onClose: () => void;
  onBrowse: () => void;
  onCamera: () => void;
  onDrop: (files: FileList) => void;
}

function ImportModal({
  isOpen,
  isImporting,
  isAddingPages,
  error,
  onClose,
  onBrowse,
  onCamera,
  onDrop,
}: ImportModalProps) {
  if (!isOpen) {
    return null;
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!isImporting && event.dataTransfer.files.length) {
      onDrop(event.dataTransfer.files);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="modal-header">
          <div>
            <p className="eyebrow">{isAddingPages ? 'Keep building' : 'New document'}</p>
            <h2 id="import-title">{isAddingPages ? 'Add pages' : 'Start a new scan'}</h2>
            <p>{isAddingPages ? 'Bring in another capture for this document.' : 'Choose how you want to bring a page into Paperflow.'}</p>
          </div>
          <button className="icon-button" type="button" aria-label="Close import dialog" onClick={onClose} disabled={isImporting}>
            <X size={19} />
          </button>
        </div>

        <div className="import-options">
          <button className="import-option" type="button" onClick={onCamera} disabled={isImporting}>
            <span className="import-option-icon import-option-icon-camera">
              <Camera size={21} />
            </span>
            <span className="import-option-copy">
              <strong>Use camera</strong>
              <small>Capture a fresh page with your device camera</small>
            </span>
            <ChevronRight size={18} />
          </button>
          <button className="import-option" type="button" onClick={onBrowse} disabled={isImporting}>
            <span className="import-option-icon import-option-icon-upload">
              <Upload size={21} />
            </span>
            <span className="import-option-copy">
              <strong>Choose from device</strong>
              <small>Select one or more photos from your files</small>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>

        <div
          className={`drop-zone ${isImporting ? 'drop-zone-busy' : ''}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          {isImporting ? <LoaderCircle className="spin" size={19} /> : <ImagePlus size={19} />}
          <span>{isImporting ? 'Preparing your pages…' : 'Or drag and drop image files here'}</span>
        </div>

        {error ? (
          <div className="import-error" role="alert">
            <Info size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="modal-note">
          <ShieldCheck size={16} />
          <span>Images are resized for faster local storage and never leave this device.</span>
        </div>
      </section>
    </div>
  );
}

function getDataUrlDimensions(source: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
    });
    image.onerror = () => reject(new Error('Paperflow could not measure the rendered page.'));
    image.src = source;
  });
}

export default App;
