import {ConfigService, Did, DidUri, ICredential, KeyRelationship, keyRelationships,} from '@kiltprotocol/sdk-js';

import {base16} from 'multiformats/bases/base16';

import * as zip from '@zip.js/zip.js';
import JSZip from 'jszip';

import {createHash, createHashFromHashArray} from './sign-helpers';
import {FileEntry, SignDoc} from './types';
import {VerificationKeyRelationship} from "@kiltprotocol/types";

export function addMissingPrefix(hash: string): string {
    return hash.startsWith(base16.prefix) ? hash : `${base16.prefix}${hash}`;
}

export function parseJWS(jws: string) {
    const [headerJSON, payloadJSON, signature] = jws.split('.').map(atob);

    const header = JSON.parse(headerJSON);
    const payload = JSON.parse(payloadJSON);

    return {
        header,
        payload: {
            ...payload,
            hash: addMissingPrefix(payload.hash),
        },
        signature,
    };
}

export async function getSignDoc(file: File): Promise<SignDoc> {
    const data = JSON.parse(await file.text()) as SignDoc;

    const {jws, hashes, remark, credentials} = data;
    if (!jws || !hashes) {
        throw new Error('Invalid content');
    }
    const parsedJWS = parseJWS(jws);

    const hashesWithPrefix = hashes.map(addMissingPrefix);
    const baseHash = await createHashFromHashArray(hashesWithPrefix);
    const baseHashesMatch = baseHash === parsedJWS.payload.hash;
    if (!baseHashesMatch) {
        throw new Error('Hashes do not match');
    }

    const {
        header: {kid: keyUri},
        payload: {hash: message},
        signature,
    } = parsedJWS;

    await Did.verifyDidSignature({
        message,
        signature: Buffer.from(signature),
        keyUri,
       expectedVerificationMethod:  "authentication",
    });

    return {
        jws,
        hashes: hashesWithPrefix,
        remark,
        credentials,
    };
}

export async function unzipFileEntries(file: File): Promise<FileEntry[]> {
    const reader = new zip.ZipReader(new zip.BlobReader(file));
    const entries = await reader.getEntries();
    const fileEntries = entries.filter(({getData}) => getData);
    const result = await Promise.all(
        fileEntries.map(async (entry) => {
            if (!entry.getData) throw new Error('Impossible: no entry.getData');
            const buffer = await entry.getData(new zip.Uint8ArrayWriter());
            const name = entry.filename;
            const file = new File([buffer], name);
            const hash = await createHash(buffer);
            return {file, buffer, name, hash};
        }),
    );
    await reader.close();
    return result;
}

export function isVerified(hash: string, name: string, hashes: string[]) {
    return isDidSignFile({name}) || hashes.includes(hash);
}

export function hasUnverified(files: FileEntry[], hashes: string[]) {
    return files.some(({hash, name}) => !isVerified(hash, name, hashes));
}

export async function getFileNames(file: File): Promise<string[]> {
    const {files} = await new JSZip().loadAsync(file);
    return Object.keys(files).filter((key) => !key.startsWith('__MACOSX/'));
}

export function isDidSignFile({name}: { name: string }) {
    return name.endsWith('.didsign');
}

export async function getW3NOrDid(did: DidUri): Promise<string> {
    const api = await ConfigService.get('api');
    const web3name = await api.call.didApi.queryDid(did);
    return web3name ? `w3n:${web3name}` : did;
}

export async function getAttestationForRequest(
    req4Att: ICredential,
) {
    const api = await ConfigService.get('api');

    // const attestation = await api.query.attestation.attestations(claimHash)

    // const isAttested = attestation.isSome && attestation.unwrap().revoked.isFalse

    return await api.query.attestation.attestations(req4Att.rootHash);
}