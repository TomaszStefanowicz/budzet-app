export interface ClientNameFromFile {
  nip: string;
  name: string;
}

export interface ExistingClient {
  nip: string;
  name: string;
}

export interface ClientDictionaryPlan {
  toInsert: { nip: string; name: string }[];
  toUpdate: { nip: string; name: string; previousName: string }[];
}

/**
 * Wylicza zmiany w słowniku klientów (SPEC.md V.35, zadanie 1.6b) - czysta
 * funkcja, bez dostępu do bazy (CLAUDE.md pkt 6). Nowy NIP trafia do
 * `toInsert`; NIP już znany, ale z inną nazwą niż zapisana, trafia do
 * `toUpdate` razem ze starą nazwą jako `previousName` (klient rzadko, ale
 * zmienia nazwę - nowa przez jakiś czas nikomu nic nie mówi). Typ klienta
 * nigdy nie jest tu ruszany - zmienia go wyłącznie człowiek w słowniku.
 *
 * Przy kilku wystąpieniach tego samego NIP w jednym pliku bierzemy nazwę
 * z ostatniego wersu - wersy w pliku są chronologiczne, więc wcześniejszy
 * wers może mieć nazwę sprzed zmiany.
 */
export function planClientDictionaryUpdates(
  fileRows: ClientNameFromFile[],
  existingClients: ExistingClient[]
): ClientDictionaryPlan {
  const lastNameByNip = new Map<string, string>();
  for (const row of fileRows) {
    lastNameByNip.set(row.nip, row.name);
  }

  const existingNameByNip = new Map(existingClients.map((c) => [c.nip, c.name]));

  const toInsert: ClientDictionaryPlan["toInsert"] = [];
  const toUpdate: ClientDictionaryPlan["toUpdate"] = [];

  for (const [nip, name] of lastNameByNip) {
    const existingName = existingNameByNip.get(nip);
    if (existingName === undefined) {
      toInsert.push({ nip, name });
    } else if (existingName !== name) {
      toUpdate.push({ nip, name, previousName: existingName });
    }
  }

  return { toInsert, toUpdate };
}
