// Dependencies
import React, { PureComponent } from 'react'
import { forIn, reduce, union, clamp, debounce } from 'lodash'
import { Linking, FlatList, Alert } from 'react-native'

// Utils
import { TronVaultURL } from '../../utils/deeplinkUtils'
import { formatNumber } from '../../utils/numberUtils'

// Components
import * as Utils from '../../components/Utils'
import Header from '../../components/Header'
import VoteItem from '../../components/Vote/list/Item'
import AddVotesModal from '../../components/Vote/AddModal'
import ConfirmModal from '../../components/Vote/ConfirmModal'
import FadeIn from '../../components/Animations/FadeIn'
import GrowIn from '../../components/Animations/GrowIn'
import ConfirmVotes from '../../components/Vote/ConfirmButton'
import NavigationHeader from '../../components/Navigation/Header'
import ClearVotes from '../../components/ClearButton'
import SyncButton from '../../components/SyncButton'

// Service
import WalletClient from '../../services/client'
import { signTransaction } from '../../utils/transactionUtils'

import getCandidateStore from '../../store/candidates'
import { withContext } from '../../store/context'
import getTransactionStore from '../../store/transactions'

const LIST_STEP_SIZE = 20

const INITIAL_STATE = {
  // Numbers of Interest
  totalVotes: 0,
  totalRemaining: 0,
  totalUserVotes: 0,
  amountToVote: 0,
  // Vote Lists
  voteList: [],
  currentVotes: {},
  currentFullVotes: [],
  userVotes: {},
  // Items
  search: '',
  currentVoteItem: {},
  // Loading
  loadingList: true,
  refreshing: false,
  // Flags
  offset: 0,
  modalVisible: false,
  confirmModalVisible: false,
  startedVoting: false,
  // Errors
  votesError: '',
  listError: ''

}

class VoteScene extends PureComponent {
  constructor () {
    super()
    this.state = INITIAL_STATE

    this.resetAddModal = {
      currentVoteItem: {},
      amountToVote: 0,
      modalVisible: false
    }
    this.resetVoteData = {
      amountToVote: 0,
      refreshing: true,
      currentVoteItem: {},
      startedVoting: false,
      userVotes: {},
      search: ''
    }
  }

  async componentDidMount () {
    this._onSearch = debounce(this._onSearch, 500)
    this._loadCandidates()
    this.didFocusSubscription = this.props.navigation.addListener(
      'didFocus',
      this._loadData
    )
  }

  componentWillUnmount () {
    this.didFocusSubscription.remove()
  }

  _loadData = async () => {
    const { navigation } = this.props

    this.setState(this.resetVoteData, async () => {
      await this._refreshCandidates()
      await this._loadUserData()
      this.setState({ loadingList: false, refreshing: false })
    })

    navigation.setParams({
      clearVotes: this._clearVotesFromList,
      disabled: true,
      votesError: null,
      listError: null
    })
  }

  _getVoteListFromStore = async (store = null) => {
    let voteStore
    if (store) voteStore = store
    else voteStore = await getCandidateStore()
    return voteStore
      .objects('Candidate')
      .sorted([['votes', true], ['url', false]])
      .slice(
        this.state.offset,
        clamp(
          this.state.offset + LIST_STEP_SIZE,
          voteStore.objects('Candidate').length
        )
      )
      .map(item => Object.assign({}, item))
  }

  _getLastUserVotesFromStore = async () => {
    const transactionStore = await getTransactionStore()
    const lastVoteTransaction = transactionStore
      .objects('Transaction')
      .sorted([['timestamp', true]])
      .filtered('type == "Vote"')[0]

    if (lastVoteTransaction) {
      let lastVote = lastVoteTransaction.contractData.votes
      let renormalize = {}
      for (let vote of lastVote) {
        renormalize[vote.voteAddress] = vote.voteCount
      }
      return renormalize
    }
    return {}
  }

  _loadCandidates = async () => {
    try {
      const voteList = await this._getVoteListFromStore()

      this.setState({ voteList })
    } catch (e) {
      e.name = 'Load Candidates Error'
      this._throwError(e)
    }
  }

  _refreshCandidates = async () => {
    this.setState({ offset: 0 })
    try {
      const { candidates, totalVotes } = await WalletClient.getTotalVotes()
      const store = await getCandidateStore()
      store.write(() =>
        candidates.map(item => store.create('Candidate', item, true))
      )
      const voteList = await this._getVoteListFromStore(store)
      this.setState({
        voteList,
        totalVotes
      })
    } catch (e) {
      e.name = 'Refresh Candidates Error'
      this._throwError(e)
    } finally {
      this.setState({ refreshing: false })
    }
  }

  _loadMoreCandidates = async () => {
    try {
      this.setState({ offset: this.state.offset + LIST_STEP_SIZE }, async () => {
        const voteList = await this._getVoteListFromStore()
        this.setState({
          voteList: union(this.state.voteList, voteList)
        })
      })
    } catch (e) {
      e.name = 'Load More Candidates Error'
      this._throwError(e)
    }
  }

  _loadUserData = async () => {
    try {
      let userVotes = await this._getLastUserVotesFromStore()
      let totalFrozen = this.props.context.freeze.value.total
      console.warn('HAHAHAH', totalFrozen)

      if (typeof userFrozen === 'undefined') {
        const apiFrozen = await WalletClient.getFreeze(this.props.context.pin)
        totalFrozen = apiFrozen.total
      }

      if (userVotes) {
        const currentUserVoteCount = this._getVoteCountFromList(userVotes)
        const newFullVoteList = await this._getUserFullVotedList(userVotes)
        this.setState({
          currentVotes: userVotes,
          totalUserVotes: currentUserVoteCount,
          totalRemaining: totalFrozen - currentUserVoteCount,
          currentFullVotes: newFullVoteList
        })
      } else {
        this.setState({
          totalRemaining: totalFrozen
        })
      }
    } catch (e) {
      e.name = 'Freeze Error'
      this._throwError(e, 'votesError')
    }
  }

  _submit = async () => {
    const { currentVotes, totalRemaining } = this.state
    const { navigation } = this.props

    if (totalRemaining >= 0) {
      this.setState({ loadingList: true })
      navigation.setParams({ disabled: true })

      forIn(currentVotes, function (value, key) {
        currentVotes[key] = Number(value)
      })
      try {
        const data = await WalletClient.getVoteWitnessTransaction(this.props.context.pin, currentVotes)
        this._openTransactionDetails(data)
      } catch (error) {
        Alert.alert('Error while building transaction, try again.')
        this.setState({ loadingList: false })
        navigation.setParams({ disabled: false })
      }
    }
  }

  _openTransactionDetails = async transactionUnsigned => {
    try {
      const transactionSigned = await signTransaction(this.props.context.pin, transactionUnsigned)
      this.setState({ loadingList: false, refreshing: false }, () => {
        this.props.navigation.navigate('SubmitTransaction', {
          tx: transactionSigned
        })
      })
    } catch (error) {
      this.setState({ error: 'Error getting transaction', loadingList: false })
    }
  }

  _openDeepLink = async dataToSend => {
    try {
      const url = `${TronVaultURL}auth/${dataToSend}`

      await Linking.openURL(url)

      this.setState({ loading: false })
    } catch (error) {
      this.setState({ loading: false }, () => {
        this.props.navigation.navigate('GetVault')
      })
    }
  }

  _onChangeVotes = async (value) => {
    const { currentVotes, currentVoteItem } = this.state
    const totalFrozen = this.props.context.freeze.value.total
    const newVotes = { ...currentVotes, [currentVoteItem.address]: value }

    const totalUserVotes = this._getVoteCountFromList(newVotes)
    const totalVotesRemaining = totalFrozen - totalUserVotes

    const currentFullVotes = await this._getUserFullVotedList(newVotes)

    this.setState({
      currentVotes: newVotes,
      currentFullVotes,
      totalRemaining: totalVotesRemaining,
      totalUserVotes,
      ...this.resetAddModal
    })
  }

  _onSearch = async value => {
    const { voteList } = this.state
    if (value) {
      const regex = new RegExp(value.toLowerCase(), 'i')
      const votesFilter = voteList.filter(vote => vote.url.toLowerCase().match(regex))
      this.setState({ voteList: votesFilter })
    } else {
      const store = await getCandidateStore()
      const voteList = store.objects('Candidate').map(item => Object.assign({}, item))
      this.setState({offset: 0}, () => {
        this.setState({ voteList })
      })
    }
  }

  _setupVoteModal = item => {
    this.setState({
      modalVisible: true,
      currentVoteItem: item,
      startedVoting: true
    })
  }

  _openConfirmModal = () => this.setState({ confirmModalVisible: true })

  _closeModal = () => this.setState({ ...this.resetAddModal })

  _closeConfirmModal = () => this.setState({ confirmModalVisible: false })

  _getUserFullVotedList = async (currentVotes) => {
    // Full Votes means users selected candidates with details, not the complete vote list
    const store = await getCandidateStore()
    const fullList = store.objects('Candidate').map(item => Object.assign({}, item))

    const userVotedList = []
    for (const voteAddress in currentVotes) {
      const voteCounted = fullList.find(v => v.address === voteAddress)
      voteCounted.voteCount = currentVotes[voteAddress]
      userVotedList.push(voteCounted)
    }
    return userVotedList
  }

  _getVoteCountFromList = (list) => list ? reduce(list, (result, value) => (Number(result) + Number(value)), 0) : 0

  _addToVote = num => {
    const { amountToVote } = this.state
    this.setState({ amountToVote: amountToVote + num })
  }

  _acceptCurrentVote = (amountToVote) => {
    amountToVote <= 0
      ? this._removeVoteFromList()
      : this._onChangeVotes(amountToVote)
  }

  _removeVoteFromList = async (address = null) => {
    const { currentVotes, currentVoteItem } = this.state
    const totalFrozen = this.props.context.freeze.value.total

    const voteToRemove = address || currentVoteItem.address
    delete currentVotes[voteToRemove]

    const newTotalVoteCount = this._getVoteCountFromList(currentVotes)
    const newCurrentFullVotes = await this._getUserFullVotedList(currentVotes)

    const newRemaining = totalFrozen - newTotalVoteCount

    this.setState({
      currentVotes,
      currentFullVotes: newCurrentFullVotes,
      totalRemaining: newRemaining,
      totalUserVotes: newTotalVoteCount,
      ...this.resetAddModal
    })
  }

  _clearVotesFromList = () => {
    const totalFrozen = this.props.context.freeze.value.total
    this.setState({
      currentVotes: [],
      currentFullVotes: [],
      totalRemaining: totalFrozen,
      totalUserVotes: 0,
      ...this.resetAddModal
    })
  }

  _renderRow = ({ item, index }) => {
    const { currentVotes, userVotes, refreshing, loadingList } = this.state
    return (
      <VoteItem
        disabled={refreshing || loadingList}
        item={item}
        index={index}
        openModal={() => this._setupVoteModal(item)}
        voteCount={currentVotes[item.address]}
        userVote={userVotes[item.address]}
      />
    )
  }

  _renderListHedear = () => {
    const { totalVotes, totalRemaining } = this.state
    return <React.Fragment>
      <GrowIn name='vote-header' height={63}>
        <Header>
          <Utils.View align='center'>
            <Utils.Text size='tiny' weight='500' secondary>
          TOTAL VOTES
            </Utils.Text>
            <Utils.VerticalSpacer />
            <Utils.Text size='small'>
              {formatNumber(totalVotes)}
            </Utils.Text>
          </Utils.View>
          <Utils.View align='center'>
            <Utils.Text size='tiny' weight='500' secondary>
              VOTES AVAILABLE
            </Utils.Text>
            <Utils.VerticalSpacer />
            <Utils.Text
              size='small'
              style={{color: `${totalRemaining < 0 ? '#dc3545' : '#fff'}`}}
            >
              {formatNumber(totalRemaining)}
            </Utils.Text>
          </Utils.View>
        </Header>
      </GrowIn>
      <Utils.View paddingX={'large'} paddingY={'small'}>
        <Utils.FormInput
          autoCapitalize='none'
          autoCorrect={false}
          underlineColorAndroid='transparent'
          onChangeText={text => this._onSearch(text, 'search')}
          placeholder='Search'
          placeholderTextColor='#fff'
          marginBottom={0}
          marginTop={0}
        />
      </Utils.View>
    </React.Fragment>
  }

  _throwError = (e, type) => {
    const errorType = type || 'listError'
    console.log(`${e.name}. ${e.message}`)
    this.setState(
      {
        [errorType]: "Oops, something didn't load correctly. Try to reload",
        loading: false
      },
      function setErrorParams () {
        this.props.navigation.setParams({
          loadData: this._loadData,
          [errorType]: this.state[errorType]
        })
      }
    )
  }

  render () {
    const {

      refreshing,
      loadingList,
      currentVotes,
      totalUserVotes,
      confirmModalVisible,
      currentFullVotes,
      voteList,
      currentVoteItem,
      startedVoting } = this.state

    return (
      <Utils.Container>
        <NavigationHeader
          title='VOTES'
          leftButton={<SyncButton
            loading={refreshing || loadingList}
            onPress={this._loadData}
          />}
          rightButton={<ClearVotes
            onPress={this.props.navigation.getParam('clearVotes')}
          />}
        />
        <FadeIn name='candidates'>
          <FlatList
            ListHeaderComponent={this._renderListHedear}
            keyExtractor={item => item.address + item.url}
            extraData={[totalUserVotes, currentFullVotes]}
            data={voteList}
            renderItem={this._renderRow}
            onEndReachedThreshold={0.5}
            onEndReached={this._loadMoreCandidates}
            refreshing={refreshing || loadingList}
            removeClippedSubviews
          />
        </FadeIn>
        {(totalUserVotes > 0 && startedVoting) && <ConfirmVotes onPress={this._openConfirmModal} voteCount={currentFullVotes.length} />}
        {this.state.modalVisible && (
          <AddVotesModal
            acceptCurrentVote={this._acceptCurrentVote}
            closeModal={this._closeModal}
            currentVoteItem={currentVoteItem}
            amountToVote={this.state.amountToVote}
            modalVisible={this.state.modalVisible}
            totalRemaining={this.state.totalRemaining || 0}
            currentVoteCount={currentVotes[currentVoteItem.address] || 0}
          />
        )}
        {this.state.confirmModalVisible && (
          <ConfirmModal
            closeModal={this._closeConfirmModal}
            modalVisible={confirmModalVisible}
            currentFullVotes={currentFullVotes}
            submitVotes={this._submit}
            removeVote={this._removeVoteFromList}
            clearVotes={this._clearVotesFromList}
          />
        )}
      </Utils.Container>
    )
  }
}

export default withContext(VoteScene)
