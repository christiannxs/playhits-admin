
import React, { useState, useMemo } from 'react';
import { Artist } from '../types';
import Modal from './Modal';
import { PlusIcon, SearchIcon, PencilIcon, TrashIcon } from './icons/Icons';

interface ArtistsViewProps {
  artists: Artist[];
  onAddArtist: (artistData: Omit<Artist, 'id'>) => void;
  onUpdateArtist: (artistData: Artist) => void;
  onDeleteArtist: (artistId: string) => void;
}

const ArtistCard: React.FC<{ artist: Artist; onEdit: (artist: Artist) => void; onDelete: (artistId: string) => void; }> = ({ artist, onEdit, onDelete }) => (
    <div className="bg-base-100 p-5 rounded-xl shadow-md flex justify-between items-center">
        <div>
            <h4 className="text-lg font-bold text-base-content">{artist.name}</h4>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={() => onEdit(artist)} className="p-2 rounded-full text-base-content-secondary hover:bg-base-300 hover:text-base-content transition-colors">
                <PencilIcon />
            </button>
            <button onClick={() => onDelete(artist.id)} className="p-2 rounded-full text-base-content-secondary hover:text-red-500 transition-colors">
                <TrashIcon />
            </button>
        </div>
    </div>
);

const ArtistsView: React.FC<ArtistsViewProps> = ({ artists, onAddArtist, onUpdateArtist, onDeleteArtist }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  const initialFormState: Omit<Artist, 'id'> = { name: '' };
  const [formData, setFormData] = useState<Omit<Artist, 'id'>>(initialFormState);
  const [searchQuery, setSearchQuery] = useState('');

  const openAddModal = () => {
    setEditingArtist(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (artist: Artist) => {
    setEditingArtist(artist);
    setFormData({ name: artist.name });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingArtist) {
      onUpdateArtist({ ...editingArtist, ...formData });
    } else {
      onAddArtist(formData);
    }
    setIsModalOpen(false);
  };

  const filteredArtists = useMemo(() => {
    return artists.filter(artist =>
      artist.name.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [artists, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-base-content">Artistas</h2>
        <button onClick={openAddModal} className="flex items-center bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors shadow-sm">
          <PlusIcon />
          <span className="ml-2">Novo Artista</span>
        </button>
      </div>

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-base-content-secondary" />
        <input
            type="text"
            placeholder="Buscar artista por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 pl-10 border rounded-lg bg-base-100 border-base-300 focus:ring-brand-primary focus:border-brand-primary"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredArtists.length > 0 ? (
          filteredArtists.map(artist => (
            <ArtistCard key={artist.id} artist={artist} onEdit={openEditModal} onDelete={onDeleteArtist} />
          ))
        ) : (
          <p className="text-base-content-secondary col-span-full text-center py-8">Nenhum artista encontrado.</p>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingArtist ? 'Editar Artista' : 'Adicionar Novo Artista'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-content-secondary mb-1">Nome do Artista</label>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-2 border rounded-lg bg-base-200 border-base-300 focus:ring-brand-primary focus:border-brand-primary" required />
          </div>
          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-brand-primary text-white px-4 py-2 rounded-lg font-semibold hover:bg-brand-secondary transition-colors">{editingArtist ? 'Salvar Alterações' : 'Salvar Artista'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ArtistsView;