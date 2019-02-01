/********************************************************************************
 * Copyright (C) 2018 Red Hat, Inc. and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { ScmMain, SCMProviderFeatures} from '../../api/plugin-api';
import { RPCProtocol } from '../../api/rpc-protocol';
import { interfaces } from 'inversify';
import { ISCMProvider, ISCMRepository, ISCMService, StatusBarCommand } from '@theia/scm/lib/common/scm';
import { Emitter, Event} from '@theia/core';
import { ISCMResourceGroup } from '@theia/scm/src/common/scm';

export class ScmMainImpl implements ScmMain {

    private scmService: ISCMService;
    private _repositories: { [handle: number]: ISCMRepository; } = {};
    private repositories: Map<number, ISCMRepository>;
    constructor(rpc: RPCProtocol, container: interfaces.Container) {
        this.scmService = container.get(ISCMService);
        this.repositories = new Map();
    }

    $registerSourceControl(handle: number, id: string, label: string, rootUri?: string): void {
        const provider: ISCMProvider = new ScmProviderImpl(id, label, rootUri);
        this.repositories.set(handle, this.scmService.registerSCMProvider(provider));
    }

    $updateSourceControl(handle: number, features: SCMProviderFeatures): void {
        const repository = this._repositories[handle];
        if (repository) {
            const provider = repository.provider as ScmProviderImpl;
            provider.$updateSourceControl(features);
        }
    }

    $unregisterSourceControl(handle: number): void {
        const repository = this._repositories[handle];

        if (repository) {
            repository.dispose();
            delete this._repositories[handle];
        }
    }

    $setInputBoxPlaceholder(sourceControlHandle: number, placeholder: string): void {
    }

    $setInputBoxValue(sourceControlHandle: number, value: string): void {
    }
}
class ScmProviderImpl implements ISCMProvider {
    private static HANDLE = 0;
    private onDidChangeEmitter = new Emitter<void>();
    private onDidChangeResourcesEmitter = new Emitter<void>();
    private onDidChangeCommitTemplateEmitter = new Emitter<string>();
    private onDidChangeStatusBarCommandsEmitter = new Emitter<StatusBarCommand[]>();
    private features: SCMProviderFeatures = {};

    constructor(
        // private proxy: ScmExt,
        private _contextValue: string,
        private _label: string,
        private _rootUri: string | undefined,
        // private scmService: ISCMService
    ) { }

    private _id = `scm${ScmProviderImpl.HANDLE++}`;
    get id(): string {
        return this._id;
    }
    readonly groups: ISCMResourceGroup[];
    get label(): string { return this._label; }
    get rootUri(): string | undefined { return this._rootUri; }
    get contextValue(): string { return this._contextValue; }
    get onDidChangeResources(): Event<void> { return this.onDidChangeResourcesEmitter.event; }
    get commitTemplate(): string | undefined { return this.features.commitTemplate; }
    get acceptInputCommand(): StatusBarCommand | undefined { return this.features.acceptInputCommand; }
    get statusBarCommands(): StatusBarCommand[] | undefined { return this.features.statusBarCommands; }
    get count(): number | undefined { return this.features.count; }
    get onDidChangeCommitTemplate(): Event<string> { return this.onDidChangeCommitTemplateEmitter.event; }
    get onDidChangeStatusBarCommands(): Event<StatusBarCommand[]> { return this.onDidChangeStatusBarCommandsEmitter.event; }
    get onDidChange(): Event<void> { return this.onDidChangeEmitter.event; }
    dispose(): void {
    }

    $updateSourceControl(features: SCMProviderFeatures): void {
        this.features = features;
        this.onDidChangeEmitter.fire(undefined);

        if (features.commitTemplate) {
            this.onDidChangeCommitTemplateEmitter.fire(features.commitTemplate);
        }

        if (features.statusBarCommands) {
            this.onDidChangeStatusBarCommandsEmitter.fire(features.statusBarCommands);
        }
    }

    async getOriginalResource(uri: string): Promise<string> {
        return '';
    }
}
