import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Heart, Trash2 } from "lucide-react";
import { Link } from "react-router";

import {
  createAssetCollection,
  deleteAsset,
  listAssetCollections,
  listAssets,
  updateAsset
} from "../lib/api-client.js";
import "../styles/assets.css";

export default function AssetsRoute() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const assets = useQuery({ queryKey: ["assets"], queryFn: listAssets });
  const collections = useQuery({ queryKey: ["asset-collections"], queryFn: listAssetCollections });
  const refresh = () =>
    void Promise.all([
      client.invalidateQueries({ queryKey: ["assets"] }),
      client.invalidateQueries({ queryKey: ["asset-collections"] })
    ]);
  const create = useMutation({
    mutationFn: () => createAssetCollection(name),
    onSuccess: () => {
      setName("");
      refresh();
    }
  });
  const update = useMutation({
    mutationFn: ({
      id,
      favorite,
      collectionId
    }: {
      id: string;
      favorite?: boolean;
      collectionId?: string | null;
    }) =>
      updateAsset(id, {
        ...(favorite !== undefined ? { favorite } : {}),
        ...(collectionId !== undefined ? { collectionId } : {})
      }),
    onSuccess: refresh
  });
  const remove = useMutation({ mutationFn: deleteAsset, onSuccess: refresh });
  return (
    <main className="asset-page">
      <header>
        <Link to="/" aria-label="AI Studio">
          D
        </Link>
        <h1>Assets</h1>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          placeholder="New collection"
        />
        <button type="submit" aria-label="Create collection">
          <FolderPlus size={18} />
        </button>
      </form>
      <section className="asset-page__collections">
        {collections.data?.map((collection) => (
          <span key={collection.id}>{collection.name}</span>
        ))}
      </section>
      <section className="asset-page__grid">
        {assets.data?.map((asset) => (
          <article key={asset.id}>
            <img src={asset.url} alt={asset.name} />
            <div>
              <strong>{asset.name}</strong>
              <button
                type="button"
                aria-label="Toggle favorite"
                onClick={() => update.mutate({ id: asset.id, favorite: !asset.favorite })}
              >
                <Heart size={17} fill={asset.favorite ? "currentColor" : "none"} />
              </button>
              <select
                value={asset.collectionId ?? ""}
                onChange={(event) =>
                  update.mutate({ id: asset.id, collectionId: event.target.value || null })
                }
              >
                <option value="">Unfiled</option>
                {collections.data?.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label="Delete asset"
                onClick={() => remove.mutate(asset.id)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
