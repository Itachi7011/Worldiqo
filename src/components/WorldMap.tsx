"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoPoint } from "@/lib/types";
import { categoryById, CATEGORIES } from "@/lib/gdelt";

interface WorldMapProps {
  points: GeoPoint[];
  /** Show the category-color legend — most useful when viewing "All signals". */
  showLegend?: boolean;
}

export default function WorldMap({ points, showLegend = false }: WorldMapProps) {
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[20, 10]}
        zoom={2}
        minZoom={2}
        worldCopyJump
        className="h-full w-full"
        preferCanvas
      >
        <TileLayer
          // CARTO's free dark basemap — no key required, attribution required & included.
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        {points.map((p) => {
          // When the filter is "All signals", each pin gets its own
          // best-guess sub-category color instead of one flat color, so the
          // map actually shows what kind of coverage is happening where.
          const cat = categoryById(p.subCategory ?? p.category);
          const radius = Math.min(6 + Math.log2(p.count + 1) * 2, 22);
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lon]}
              radius={radius}
              pathOptions={{
                color: cat.color,
                fillColor: cat.color,
                fillOpacity: 0.45,
                weight: 1.5,
              }}
            >
              <Popup maxWidth={280}>
                <div className="font-sans text-sm">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs opacity-70 mt-0.5 mb-2">
                    {p.count} mention{p.count === 1 ? "" : "s"} · {cat.label}
                  </p>
                  {p.articles.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {p.articles.map((a) => (
                        <li key={a.url}>
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline leading-snug"
                            style={{ color: cat.color }}
                          >
                            {a.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs opacity-60">No article links available.</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {showLegend && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-panel/95 border border-border rounded-lg px-3 py-2.5 backdrop-blur-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted mb-1.5">
            Pin color = topic
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
              <div key={c.id} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="text-[10px] text-muted-2 font-mono whitespace-nowrap">
                  {c.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
