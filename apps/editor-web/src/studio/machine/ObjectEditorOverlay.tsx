import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { BehaviorKind } from "../model/demoProject";
import { useStudioStore } from "../store/studioStore";

const behaviorKindOptions: Array<{ value: BehaviorKind; label: string }> = [
  { value: "control", label: "Control" },
  { value: "sequence", label: "Sequence" },
  { value: "monitoring", label: "Monitoring" }
];

export function ObjectEditorOverlay() {
  const project = useStudioStore((state) => state.project);
  const objectEditorObjectId = useStudioStore((state) => state.objectEditorObjectId);
  const objectEditorAnchor = useStudioStore((state) => state.objectEditorAnchor);
  const closeObjectEditor = useStudioStore((state) => state.closeObjectEditor);
  const openFullObjectEditor = useStudioStore((state) => state.openFullObjectEditor);
  const updateObjectMeta = useStudioStore((state) => state.updateObjectMeta);
  const overlayRef = useRef<HTMLElement | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<CSSProperties | undefined>(undefined);

  const object = project.objects.find((item) => item.id === objectEditorObjectId) ?? null;
  const candidateParents = useMemo(
    () => project.objects.filter((item) => item.id !== objectEditorObjectId),
    [project.objects, objectEditorObjectId]
  );

  useLayoutEffect(() => {
    if (!objectEditorAnchor || typeof window === "undefined") {
      setOverlayStyle(undefined);
      return;
    }

    const updatePosition = () => {
      const bounds = document.querySelector(".studio-main")?.getBoundingClientRect() ?? {
        left: 0,
        top: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
        width: window.innerWidth,
        height: window.innerHeight
      };
      const inset = 12;
      const maxWidth = Math.min(420, bounds.width - inset * 2);
      const maxHeight = Math.min(440, bounds.height - inset * 2);
      const overlayWidth = Math.min(overlayRef.current?.offsetWidth ?? maxWidth, maxWidth);
      const overlayHeight = Math.min(overlayRef.current?.offsetHeight ?? maxHeight, maxHeight);
      const minLeft = bounds.left + inset;
      const maxLeft = bounds.right - overlayWidth - inset;
      const minTop = bounds.top + inset;
      const maxTop = bounds.bottom - overlayHeight - inset;
      const preferRight = objectEditorAnchor.left;
      const preferDown = objectEditorAnchor.top;
      const preferUp = objectEditorAnchor.top - overlayHeight + 34;
      const left = Math.min(Math.max(minLeft, preferRight), Math.max(minLeft, maxLeft));
      const topCandidate = preferDown <= maxTop ? preferDown : preferUp;
      const top = Math.min(Math.max(minTop, topCandidate), Math.max(minTop, maxTop));

      setOverlayStyle({
        left: `${left}px`,
        top: `${top}px`,
        width: `${overlayWidth}px`,
        maxHeight: `${maxHeight}px`
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [objectEditorAnchor, objectEditorObjectId]);

  if (!object) {
    return null;
  }

  return (
    <div className="overlay-shell overlay-shell--popover" role="dialog" aria-modal="true" aria-label={`Edit ${object.name}`}>
      <div className="overlay-backdrop overlay-backdrop--light" onClick={closeObjectEditor} />
      <section
        ref={overlayRef}
        className={`object-editor-overlay object-editor-overlay--quick${overlayStyle ? " object-editor-overlay--anchored" : ""}`}
        style={overlayStyle}
      >
        <header className="object-editor-overlay__header object-editor-overlay__header--compact">
          <div>
            <span className="topology-eyebrow">Quick Edit</span>
            <h3>{object.name}</h3>
          </div>
          <button type="button" className="overlay-close-button" onClick={closeObjectEditor}>
            Close
          </button>
        </header>

        <form
          className="object-editor-overlay__body object-editor-overlay__body--quick"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const parentValue = String(formData.get("parentObjectId") ?? "");
            updateObjectMeta(object.id, {
              name: String(formData.get("name") ?? object.name),
              type: String(formData.get("type") ?? object.type),
              behaviorKind: String(formData.get("behaviorKind") ?? object.behaviorKind) as BehaviorKind,
              summary: String(formData.get("summary") ?? object.summary),
              parentObjectId: parentValue ? parentValue : null
            });
            closeObjectEditor();
          }}
        >
          <label className="overlay-field">
            <span>Name</span>
            <input name="name" defaultValue={object.name} />
          </label>
          <label className="overlay-field">
            <span>Type</span>
            <input name="type" defaultValue={object.type} />
          </label>
          <label className="overlay-field">
            <span>Behavior</span>
            <select name="behaviorKind" defaultValue={object.behaviorKind}>
              {behaviorKindOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="overlay-field">
            <span>Parent</span>
            <select name="parentObjectId" defaultValue={object.parentObjectId ?? ""}>
              <option value="">System level</option>
              {candidateParents.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
          <label className="overlay-field overlay-field--wide">
            <span>Summary</span>
            <textarea name="summary" defaultValue={object.summary} rows={3} />
          </label>

          <div className="overlay-actions overlay-actions--stacked">
            <button type="submit" className="inspector-link">
              Save
            </button>
            <button
              type="button"
              className="inspector-link"
              onClick={() => openFullObjectEditor(object.id)}
            >
              Open Full Editor
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
